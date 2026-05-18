import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/ops/activity'
import { enqueueAutomationEvent } from '@/lib/automation/enqueue'
import { GALLERY_MEDIA_TYPES, GALLERY_MODERATION_STATUSES, GALLERY_VISIBILITIES } from '@/lib/gallery/templates'

const MediaSchema = z.object({
  gallery_section_id: z.string().uuid().optional().nullable(),
  uploader_name: z.string().max(120).optional().nullable(),
  media_type: z.enum(GALLERY_MEDIA_TYPES),
  file_url: z.string().min(1).max(1000),
  thumbnail_url: z.string().max(1000).optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  visibility: z.enum(GALLERY_VISIBILITIES).default('public'),
  moderation_status: z.enum(GALLERY_MODERATION_STATUSES).default('approved'),
  sort_order: z.coerce.number().int().default(0),
  guest_upload: z.boolean().default(false),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const supabase = await createClient()
  let query = supabase
    .from('event_gallery_media')
    .select('*')
    .eq('occasion_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (searchParams.get('public') === 'true') {
    query = query.eq('visibility', 'public').eq('moderation_status', 'approved')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const parsed = MediaSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: event } = await supabase.from('events').select('id, is_public').eq('id', id).single()
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { data: canManage } = user
    ? await supabase.rpc('can_view_event_ops', { p_event_id: id })
    : { data: false }

  if (!canManage && !event.is_public) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const moderationStatus = canManage
    ? parsed.data.moderation_status
    : 'pending'

  const visibility = canManage ? parsed.data.visibility : 'public'

  const { data, error } = await supabase
    .from('event_gallery_media')
    .insert({
      occasion_id: id,
      gallery_section_id: parsed.data.gallery_section_id ?? null,
      uploaded_by: user?.id ?? null,
      uploader_name: parsed.data.uploader_name ?? null,
      media_type: parsed.data.media_type,
      file_url: parsed.data.file_url,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      caption: parsed.data.caption ?? null,
      visibility,
      moderation_status: moderationStatus,
      sort_order: parsed.data.sort_order,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(canManage ? supabase : createAdminClient(), {
    occasionId: id,
    actorId: user?.id ?? null,
    activityType: 'gallery.media.uploaded',
    title: moderationStatus === 'pending' ? 'Gallery upload pending review' : 'Gallery media uploaded',
    body: parsed.data.caption ?? parsed.data.uploader_name ?? null,
    entityType: 'event_gallery_media',
    entityId: data.id,
  })

  await enqueueAutomationEvent(createAdminClient(), {
    occasionId: id,
    sourceType: 'gallery_media',
    sourceId: data.id,
    eventType: parsed.data.guest_upload ? 'guest_gallery_media_uploaded' : 'gallery_media_uploaded',
    payload: { moderationStatus, mediaType: parsed.data.media_type, visibility },
  })

  return NextResponse.json(data, { status: 201 })
}
