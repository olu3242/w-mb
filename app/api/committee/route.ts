import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/ops/activity'
import { queueNotification } from '@/lib/notifications/engine'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CommitteeInviteSchema = z.object({
  occasionId: z.string().uuid(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.string().default('co_organizer'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = CommitteeInviteSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('committee_members')
    .insert({
      occasion_id: parsed.data.occasionId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'invited',
      invited_by: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    occasionId: parsed.data.occasionId,
    actorId: user.id,
    activityType: 'committee.invited',
    title: `${parsed.data.name} invited to committee`,
    body: parsed.data.role.replace(/_/g, ' '),
    entityType: 'committee_member',
    entityId: data.id,
  })

  await queueNotification(supabase, {
    occasionId: parsed.data.occasionId,
    recipientEmail: parsed.data.email,
    channel: 'email',
    notificationType: 'committee_invite',
    title: 'You were invited to an Owambe OS committee',
    body: 'Sign in to coordinate planning with the organizer.',
  })

  return NextResponse.json(data, { status: 201 })
}
