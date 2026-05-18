import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const EventAnnouncementPatchSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  body: z.string().min(1).max(3000).optional(),
  announcement_type: z.string().min(1).max(80).optional(),
  priority: z.enum(['normal', 'important', 'urgent']).optional(),
  visibility: z.enum(['public', 'guests_only', 'committee_only']).optional(),
  pinned: z.boolean().optional(),
  publish_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional().nullable(),
  share_to_public_page: z.boolean().optional(),
  share_to_whatsapp_ready: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; announcementId: string }> }) {
  const { id, announcementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = EventAnnouncementPatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('event_announcements')
    .update(parsed.data)
    .eq('id', announcementId)
    .eq('occasion_id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; announcementId: string }> }) {
  const { id, announcementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('event_announcements').delete().eq('id', announcementId).eq('occasion_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
