import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const FundSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2).max(120),
  fundType: z.enum(['welfare_support', 'emergency_relief', 'building', 'education_support', 'burial_support', 'general']),
  visibility: z.enum(['private', 'members', 'public']).default('members'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = FundSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('organization_funds')
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      fund_type: parsed.data.fundType,
      visibility: parsed.data.visibility,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('organization_activity').insert({
    organization_id: parsed.data.organizationId,
    actor_id: user.id,
    activity_type: 'fund.created',
    title: `${parsed.data.name} opened`,
    body: parsed.data.fundType.replace(/_/g, ' '),
  })

  return NextResponse.json(data, { status: 201 })
}
