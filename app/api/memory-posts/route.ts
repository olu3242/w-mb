import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const MemoryPostSchema = z.object({
  occasion_id: z.string().uuid(),
  author_name: z.string().min(1).max(120),
  message: z.string().min(2).max(1000),
  post_type: z.string().default('message'),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = MemoryPostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: event } = await supabase
    .from('events')
    .select('id, is_public')
    .eq('id', parsed.data.occasion_id)
    .eq('is_public', true)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('memory_posts')
    .insert({
      occasion_id: event.id,
      author_name: parsed.data.author_name,
      author_user_id: user?.id ?? null,
      message: parsed.data.message,
      post_type: parsed.data.post_type,
      is_public: true,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
