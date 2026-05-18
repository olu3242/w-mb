import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/ops/activity'
import { queueNotification } from '@/lib/notifications/engine'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const GuestSchema = z.object({
  occasionId: z.string().uuid(),
  groupId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  guestCount: z.coerce.number().int().min(1).max(20).default(1),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = GuestSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('event_guests')
    .insert({
      occasion_id: parsed.data.occasionId,
      group_id: parsed.data.groupId ?? null,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      guest_count: parsed.data.guestCount,
      invited_by: user.id,
    })
    .select('id, invitation_token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    occasionId: parsed.data.occasionId,
    actorId: user.id,
    activityType: 'guest.invited',
    title: `${parsed.data.name} invited`,
    entityType: 'event_guest',
    entityId: data.id,
  })

  if (parsed.data.email) {
    await queueNotification(supabase, {
      occasionId: parsed.data.occasionId,
      recipientEmail: parsed.data.email,
      channel: 'email',
      notificationType: 'guest_invite',
      title: 'You are invited',
      body: 'Open your RSVP link to respond.',
      metadata: { invitation_token: data.invitation_token },
    })
  }

  return NextResponse.json(data, { status: 201 })
}
