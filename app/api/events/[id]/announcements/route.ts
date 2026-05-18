import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/ops/activity'
import { enqueueAutomationEvent } from '@/lib/automation/enqueue'
import { generateAnnouncementShareCopy } from '@/lib/announcements/templates'

const EventAnnouncementSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(3000),
  announcement_type: z.string().min(1).max(80),
  priority: z.enum(['normal', 'important', 'urgent']).default('normal'),
  visibility: z.enum(['public', 'guests_only', 'committee_only']).default('public'),
  pinned: z.boolean().default(false),
  publish_at: z.string().datetime().optional(),
  expires_at: z.string().datetime().optional().nullable(),
  share_to_public_page: z.boolean().default(true),
  share_to_whatsapp_ready: z.boolean().default(true),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  let query = supabase
    .from('event_announcements')
    .select('*')
    .eq('occasion_id', id)
    .order('pinned', { ascending: false })
    .order('publish_at', { ascending: false })

  if (searchParams.get('public') === 'true') {
    query = query
      .eq('visibility', 'public')
      .eq('share_to_public_page', true)
      .lte('publish_at', new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
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

  const parsed = EventAnnouncementSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: canManage } = await supabase.rpc('can_view_event_ops', { p_event_id: id })
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: event } = await supabase.from('events').select('title, slug').eq('id', id).single()
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/e/${event?.slug ?? ''}`
  const whatsappCopy = generateAnnouncementShareCopy({
    eventName: event?.title ?? 'this event',
    title: parsed.data.title,
    body: parsed.data.body,
    link: publicUrl,
  })

  const { data, error } = await supabase
    .from('event_announcements')
    .insert({
      ...parsed.data,
      publish_at: parsed.data.publish_at ?? new Date().toISOString(),
      expires_at: parsed.data.expires_at ?? null,
      occasion_id: id,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (parsed.data.share_to_public_page && parsed.data.visibility === 'public') {
    await supabase.from('event_updates').insert({
      occasion_id: id,
      title: parsed.data.title,
      body: parsed.data.body,
      is_public: true,
      created_by: user.id,
    })
  }

  await logActivity(supabase, {
    occasionId: id,
    actorId: user.id,
    activityType: 'announcement.created',
    title: parsed.data.title,
    body: parsed.data.body,
    visibility: parsed.data.visibility === 'public' ? 'public' : 'organizers',
    entityType: 'event_announcement',
    entityId: data.id,
    metadata: { priority: parsed.data.priority, visibility: parsed.data.visibility, whatsappCopy },
  })

  await enqueueAutomationEvent(createAdminClient(), {
    occasionId: id,
    sourceType: 'event_announcement',
    sourceId: data.id,
    eventType: parsed.data.priority === 'urgent' ? 'urgent_announcement_published' : 'event_announcement_created',
    payload: {
      title: parsed.data.title,
      announcementType: parsed.data.announcement_type,
      priority: parsed.data.priority,
      visibility: parsed.data.visibility,
      whatsappCopy,
    },
  })

  return NextResponse.json({ ...data, whatsappCopy }, { status: 201 })
}
