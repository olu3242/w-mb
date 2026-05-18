import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessAutomationScope } from '@/lib/automation/security'

const Schema = z.object({
  isActive: z.boolean().optional(),
  actionPayload: z.record(z.unknown()).optional(),
  conditions: z.record(z.unknown()).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: rule } = await admin.from('automation_rules').select('*').eq('id', id).maybeSingle()
  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 })

  const allowed = await canAccessAutomationScope(supabase, user, {
    occasionId: rule.occasion_id,
    organizationId: rule.organization_id,
  })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const patch: Record<string, unknown> = {}
  if (typeof parsed.data.isActive === 'boolean') {
    patch.is_active = parsed.data.isActive
    patch.active = parsed.data.isActive
  }
  if (parsed.data.actionPayload) patch.action_payload = parsed.data.actionPayload
  if (parsed.data.conditions) patch.conditions = parsed.data.conditions

  const { data, error } = await admin.from('automation_rules').update(patch).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data })
}
