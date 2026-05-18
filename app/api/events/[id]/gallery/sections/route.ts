import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/ops/activity'
import { GALLERY_SECTION_TYPES, GALLERY_VISIBILITIES, getGallerySectionPresets } from '@/lib/gallery/templates'

const SectionSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  section_type: z.enum(GALLERY_SECTION_TYPES).default('custom'),
  visibility: z.enum(GALLERY_VISIBILITIES).default('public'),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const supabase = await createClient()
  let query = supabase
    .from('event_gallery_sections')
    .select('*, event_gallery_media(*)')
    .eq('occasion_id', id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (searchParams.get('public') === 'true') {
    query = query.eq('visibility', 'public')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = SectionSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('event_gallery_sections')
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
    activityType: 'gallery.section.created',
    title: `Gallery section created: ${data.title}`,
    entityType: 'event_gallery_section',
    entityId: data.id,
  })

  return NextResponse.json(data, { status: 201 })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: event } = await supabase.from('events').select('occasion_type').eq('id', id).single()
  const presets = getGallerySectionPresets(event?.occasion_type)
  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = presets.map((preset, index) => ({
    occasion_id: id,
    created_by: user.id,
    title: preset.title,
    description: preset.description,
    section_type: preset.sectionType,
    visibility: 'public',
    sort_order: index,
    is_active: true,
  }))

  const { data, error } = await supabase
    .from('event_gallery_sections')
    .insert(rows)
    .select('*')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    occasionId: id,
    actorId: user.id,
    activityType: 'gallery.sections.seeded',
    title: 'Default gallery sections created',
    body: presets.map(preset => preset.title).join(', '),
  })

  return NextResponse.json(data ?? [], { status: 201 })
}
