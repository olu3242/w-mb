import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { GALLERY_MODERATION_STATUSES, GALLERY_VISIBILITIES } from '@/lib/gallery/templates'

const MediaPatchSchema = z.object({
  gallery_section_id: z.string().uuid().optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  visibility: z.enum(GALLERY_VISIBILITIES).optional(),
  moderation_status: z.enum(GALLERY_MODERATION_STATUSES).optional(),
  sort_order: z.coerce.number().int().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = MediaPatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('event_gallery_media')
    .update(parsed.data)
    .eq('id', mediaId)
    .eq('occasion_id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id, mediaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('event_gallery_media').delete().eq('id', mediaId).eq('occasion_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
