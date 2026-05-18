import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-')
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File must be 10 MB or smaller' }, { status: 400 })

  const path = `${id}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error } = await supabase.storage.from('event-invitations').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = `/api/events/${id}/invitations/upload?path=${encodeURIComponent(path)}`
  return NextResponse.json({ path, url })
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
    const [{ data: event }, { data: invitation }] = await Promise.all([
      admin.from('events').select('id').eq('id', id).eq('is_public', true).maybeSingle(),
      admin
        .from('event_invitations')
        .select('id')
        .eq('occasion_id', id)
        .eq('is_active', true)
        .or(`file_url.ilike.%${path}%,preview_url.ilike.%${path}%`)
        .maybeSingle(),
    ])
    allowed = !!event && !!invitation
  }

  if (!allowed) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('event-invitations').download(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
