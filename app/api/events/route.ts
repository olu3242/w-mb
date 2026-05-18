import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { EventSchema } from '@/lib/validations'
import { generateSlug } from '@/lib/utils'
import { generatePlanningWorkspace } from '@/lib/occasion/workspace-generation'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueAutomationEvent } from '@/lib/automation/enqueue'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = EventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const slug = generateSlug(parsed.data.title)
  const { data, error } = await supabase
    .from('events')
    .insert({ ...parsed.data, slug, owner_id: user.id, signals: body.signals ?? {} })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await generatePlanningWorkspace(supabase, {
    id: data.id,
    event_date: data.event_date,
    occasion_type: data.occasion_type,
    owner_id: data.owner_id,
  })
  await enqueueAutomationEvent(createAdminClient(), {
    occasionId: data.id,
    sourceType: 'occasion',
    sourceId: data.id,
    eventType: 'occasion_created',
    payload: { title: data.title, occasionType: data.occasion_type },
  })

  return NextResponse.json(data, { status: 201 })
}
