import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/ops/activity'
import { enqueueAutomationEvent } from '@/lib/automation/enqueue'

const InvitationSchema = z.object({
  invitation_type: z.string().min(1).max(80),
  source_type: z.enum(['designed', 'uploaded', 'ai_generated']).default('designed'),
  title: z.string().min(1).max(160),
  subtitle: z.string().max(200).optional().nullable(),
  body: z.string().max(3000).optional().nullable(),
  host_names: z.string().max(240).optional().nullable(),
  venue_name: z.string().max(200).optional().nullable(),
  venue_address: z.string().max(300).optional().nullable(),
  dress_code: z.string().max(160).optional().nullable(),
  rsvp_note: z.string().max(500).optional().nullable(),
  support_note: z.string().max(500).optional().nullable(),
  template_id: z.string().max(80).optional().nullable(),
  theme_id: z.string().max(80).optional().nullable(),
  design_json: z.record(z.any()).default({}),
  file_url: z.string().url().optional().nullable(),
  preview_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_invitations')
    .select('*')
    .eq('occasion_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = InvitationSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (parsed.data.is_active) {
    await supabase.from('event_invitations').update({ is_active: false }).eq('occasion_id', id)
  }

  const { data, error } = await supabase
    .from('event_invitations')
    .insert({
      ...parsed.data,
      occasion_id: id,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    occasionId: id,
    actorId: user.id,
    activityType: 'invitation.created',
    title: 'Invitation created',
    body: data.title,
    entityType: 'event_invitation',
    entityId: data.id,
  })

  await enqueueAutomationEvent(createAdminClient(), {
    occasionId: id,
    sourceType: 'event_invitation',
    sourceId: data.id,
    eventType: 'event_invitation_created',
    payload: { title: data.title, sourceType: data.source_type, templateId: data.template_id },
  })

  return NextResponse.json(data, { status: 201 })
}
