import { createClient } from '@/lib/supabase/server'
import { generateOrganizationSlug, ORGANIZATION_TYPES } from '@/lib/organization/utils'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const OrganizationSchema = z.object({
  name: z.string().min(2).max(160),
  organizationType: z.enum(ORGANIZATION_TYPES),
  description: z.string().max(1000).optional().or(z.literal('')),
  country: z.string().max(80).optional().or(z.literal('')),
  timezone: z.string().max(80).default('UTC'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = OrganizationSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const slug = generateOrganizationSlug(parsed.data.name)
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: parsed.data.name,
      slug,
      organization_type: parsed.data.organizationType,
      description: parsed.data.description || null,
      country: parsed.data.country || null,
      timezone: parsed.data.timezone,
      created_by: user.id,
    })
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('organization_members').insert({
    organization_id: data.id,
    user_id: user.id,
    role: 'admin',
    status: 'active',
  })

  await supabase.from('organization_activity').insert({
    organization_id: data.id,
    actor_id: user.id,
    activity_type: 'organization.created',
    title: `${parsed.data.name} workspace created`,
  })

  return NextResponse.json(data, { status: 201 })
}
