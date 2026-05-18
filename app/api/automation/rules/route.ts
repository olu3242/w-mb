import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAccessAutomationScope } from '@/lib/automation/security'

const Schema = z.object({
  organizationId: z.string().uuid().optional().nullable(),
  occasionId: z.string().uuid().optional().nullable(),
  ruleType: z.string(),
  triggerType: z.string(),
  actionType: z.string(),
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(500),
  suggestedAction: z.string().min(1).max(500),
  conditions: z.record(z.unknown()).optional(),
  actionPayload: z.record(z.unknown()).optional(),
})

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await canAccessAutomationScope(supabase, user, {
    occasionId: parsed.data.occasionId,
    organizationId: parsed.data.organizationId,
  })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await createAdminClient().from('automation_rules').insert({
    organization_id: parsed.data.organizationId ?? null,
    occasion_id: parsed.data.occasionId ?? null,
    rule_type: parsed.data.ruleType,
    trigger_type: parsed.data.triggerType,
    action_type: parsed.data.actionType,
    title: parsed.data.title,
    description: parsed.data.description,
    suggested_action: parsed.data.suggestedAction,
    conditions: parsed.data.conditions ?? {},
    action_payload: parsed.data.actionPayload ?? {},
    created_by: user.id,
    is_active: true,
    active: true,
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data })
}
