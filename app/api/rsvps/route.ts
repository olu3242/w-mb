import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/ops/activity'
import { enqueueAutomationEvent } from '@/lib/automation/enqueue'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const RsvpSchema = z.object({
  invitationToken: z.string().uuid(),
  status: z.enum(['accepted', 'declined', 'maybe']),
  attendeeCount: z.coerce.number().int().min(0).max(20).default(1),
  note: z.string().max(500).optional().or(z.literal('')),
})

export async function POST(request: Request) {
  const parsed = RsvpSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const { data: guest } = await admin
    .from('event_guests')
    .select('id, occasion_id, name')
    .eq('invitation_token', parsed.data.invitationToken)
    .single()

  if (!guest) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

  const attendeeCount = parsed.data.status === 'declined' ? 0 : parsed.data.attendeeCount
  const { data: rsvp, error } = await admin
    .from('event_rsvps')
    .insert({
      occasion_id: guest.occasion_id,
      guest_id: guest.id,
      status: parsed.data.status,
      attendee_count: attendeeCount,
      note: parsed.data.note || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin
    .from('event_guests')
    .update({ status: parsed.data.status, guest_count: Math.max(1, attendeeCount) })
    .eq('id', guest.id)

  await logActivity(admin, {
    occasionId: guest.occasion_id,
    activityType: 'rsvp.submitted',
    title: `${guest.name} RSVP ${parsed.data.status}`,
    visibility: 'organizers',
    entityType: 'event_rsvp',
    entityId: rsvp.id,
  })
  await enqueueAutomationEvent(admin, {
    occasionId: guest.occasion_id,
    sourceType: 'rsvp',
    sourceId: rsvp.id,
    eventType: 'rsvp_received',
    payload: { guestName: guest.name, status: parsed.data.status, attendeeCount },
  })

  return NextResponse.json({ id: rsvp.id }, { status: 201 })
}
