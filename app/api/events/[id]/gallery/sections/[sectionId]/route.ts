import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { GALLERY_SECTION_TYPES, GALLERY_VISIBILITIES } from '@/lib/gallery/templates'

const SectionPatchSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional().nullable(),
  section_type: z.enum(GALLERY_SECTION_TYPES).optional(),
  visibility: z.enum(GALLERY_VISIBILITIES).optional(),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = SectionPatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('event_gallery_sections')
    .update(parsed.data)
    .eq('id', sectionId)
    .eq('occasion_id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('event_gallery_sections')
    .update({ is_active: false })
    .eq('id', sectionId)
    .eq('occasion_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
