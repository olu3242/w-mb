import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const MemberSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(['admin', 'finance', 'welfare', 'logistics', 'coordinator', 'member']).default('member'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = MemberSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      status: 'invited',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('organization_activity').insert({
    organization_id: parsed.data.organizationId,
    actor_id: user.id,
    activity_type: 'member.invited',
    title: `${parsed.data.name} invited`,
    body: parsed.data.role,
  })

  return NextResponse.json(data, { status: 201 })
}
