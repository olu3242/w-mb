import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PledgeSchema = z.object({
  occasion_id: z.string().uuid(),
  sponsorship_category_id: z.string().uuid().optional().nullable(),
  contributor_name: z.string().min(1).max(120),
  contributor_email: z.string().email().optional().or(z.literal('')),
  amount: z.coerce.number().min(1),
  message: z.string().max(500).optional().or(z.literal('')),
  is_anonymous: z.boolean().default(false),
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = PledgeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: event } = await supabase
    .from('events')
    .select('id, is_public')
    .eq('id', parsed.data.occasion_id)
    .eq('is_public', true)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const amount = Math.round(parsed.data.amount * 100)
  const { data: contribution, error } = await admin
    .from('contributions')
    .insert({
      event_id: event.id,
      occasion_id: event.id,
      sponsorship_category_id: parsed.data.sponsorship_category_id ?? null,
      contributor_user_id: user?.id ?? null,
      amount,
      currency: 'USD',
      contributor_name: parsed.data.contributor_name,
      contributor_email: parsed.data.contributor_email || null,
      message: parsed.data.message || null,
      is_anonymous: parsed.data.is_anonymous,
      status: 'pledged',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (parsed.data.sponsorship_category_id) {
    await admin.rpc('increment_sponsorship_funded_amount', {
      p_category_id: parsed.data.sponsorship_category_id,
      p_amount: amount,
    })
  }

  return NextResponse.json({ contribution_id: contribution.id, status: 'pledged' }, { status: 201 })
}
