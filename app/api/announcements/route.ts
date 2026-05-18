import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/ops/activity'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const AnnouncementSchema = z.object({
  occasionId: z.string().uuid(),
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(2000),
  audience: z.enum(['guests', 'committee', 'contributors', 'public']).default('guests'),
  channel: z.enum(['in_app', 'email', 'whatsapp_ready']).default('in_app'),
  publishUpdate: z.boolean().default(false),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = AnnouncementSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      occasion_id: parsed.data.occasionId,
      title: parsed.data.title,
      body: parsed.data.body,
      audience: parsed.data.audience,
      channel: parsed.data.channel,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (parsed.data.publishUpdate) {
    await supabase.from('event_updates').insert({
      occasion_id: parsed.data.occasionId,
      title: parsed.data.title,
      body: parsed.data.body,
      is_public: parsed.data.audience === 'public' || parsed.data.audience === 'guests',
      created_by: user.id,
    })
  }

  await logActivity(supabase, {
    occasionId: parsed.data.occasionId,
    actorId: user.id,
    activityType: 'announcement.posted',
    title: parsed.data.title,
    body: parsed.data.body,
    visibility: parsed.data.audience === 'public' ? 'public' : 'organizers',
    entityType: 'announcement',
    entityId: data.id,
  })

  return NextResponse.json(data, { status: 201 })
}
