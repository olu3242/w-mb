import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const InvitationPatchSchema = z.object({
  invitation_type: z.string().min(1).max(80).optional(),
  source_type: z.enum(['designed', 'uploaded', 'ai_generated']).optional(),
  title: z.string().min(1).max(160).optional(),
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
  design_json: z.record(z.any()).optional(),
  file_url: z.string().url().optional().nullable(),
  preview_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  const { id, invitationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = InvitationPatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (parsed.data.is_active) {
    await supabase.from('event_invitations').update({ is_active: false }).eq('occasion_id', id).neq('id', invitationId)
  }

  const { data, error } = await supabase
    .from('event_invitations')
    .update(parsed.data)
    .eq('id', invitationId)
    .eq('occasion_id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  const { id, invitationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('event_invitations').delete().eq('id', invitationId).eq('occasion_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
