import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getMediaTypeFromMime } from '@/lib/gallery/templates'

const IMAGE_LIMIT = 8 * 1024 * 1024
const VIDEO_LIMIT = 50 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'])

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-')
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: event } = await supabase.from('events').select('id, is_public').eq('id', id).single()
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { data: canManage } = user
    ? await supabase.rpc('can_view_event_ops', { p_event_id: id })
    : { data: false }
  if (!canManage && !event.is_public) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 })

  const mediaType = getMediaTypeFromMime(file.type)
  if (!mediaType) return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 })

  const limit = mediaType === 'image' ? IMAGE_LIMIT : VIDEO_LIMIT
  if (file.size > limit) {
    return NextResponse.json({ error: mediaType === 'image' ? 'Images must be 8 MB or smaller' : 'Videos must be 50 MB or smaller' }, { status: 400 })
  }

  const path = `${id}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const storage = canManage ? supabase.storage : createAdminClient().storage
  const { error } = await storage.from('event-gallery').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    path,
    mediaType,
    url: `/api/events/${id}/gallery/upload?path=${encodeURIComponent(path)}`,
  })
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  if (!path || !path.startsWith(`${id}/`)) return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let allowed = false

  if (user) {
    const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
    allowed = !!canManage
  }

  if (!allowed) {
    const admin = createAdminClient()
    const [{ data: event }, { data: media }] = await Promise.all([
      admin.from('events').select('id').eq('id', id).eq('is_public', true).maybeSingle(),
      admin
        .from('event_gallery_media')
        .select('id')
        .eq('occasion_id', id)
        .eq('visibility', 'public')
        .eq('moderation_status', 'approved')
        .or(`file_url.ilike.%${path}%,thumbnail_url.ilike.%${path}%`)
        .maybeSingle(),
    ])
    allowed = !!event && !!media
  }

  if (!allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('event-gallery').download(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
