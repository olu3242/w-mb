import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const OrganizationEventSchema = z.object({
  organizationId: z.string().uuid(),
  occasionId: z.string().uuid(),
  recurrenceRule: z.string().max(120).optional().or(z.literal('')),
  recurrenceLabel: z.string().max(120).optional().or(z.literal('')),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = OrganizationEventSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('organization_events')
    .insert({
      organization_id: parsed.data.organizationId,
      occasion_id: parsed.data.occasionId,
      recurrence_rule: parsed.data.recurrenceRule || null,
      recurrence_label: parsed.data.recurrenceLabel || null,
    })
    .select('organization_id, occasion_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('organization_activity').insert({
    organization_id: parsed.data.organizationId,
    actor_id: user.id,
    activity_type: 'event.linked',
    title: 'Event linked to organization',
    body: parsed.data.recurrenceLabel || parsed.data.recurrenceRule || null,
  })

  return NextResponse.json(data, { status: 201 })
}
