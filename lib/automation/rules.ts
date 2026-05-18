import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { DEFAULT_AUTOMATION_RULES } from './default-rules'
import type { AutomationEventInput, AutomationRuleRecord } from './types'

export async function listMatchingRules(
  supabase: SupabaseClient<Database, 'public'>,
  event: AutomationEventInput,
) {
  const { data } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('trigger_type', event.eventType)

  return ((data ?? []) as AutomationRuleRecord[]).filter(rule => {
    const active = rule.is_active ?? rule.active ?? true
    if (!active) return false
    if (rule.occasion_id && rule.occasion_id !== event.occasionId) return false
    if (rule.organization_id && rule.organization_id !== event.organizationId) return false
    return true
  })
}

export async function ensureDefaultAutomationRules(supabase: SupabaseClient<Database, 'public'>) {
  const rows = DEFAULT_AUTOMATION_RULES.map(rule => ({
    id: rule.id,
    rule_type: rule.ruleType,
    trigger_type: rule.triggerType,
    action_type: rule.actionType,
    title: rule.title,
    description: rule.description,
    suggested_action: rule.suggestedAction,
    conditions: {},
    action_payload: {},
    metadata: {},
    is_active: true,
    active: true,
  }))

  await supabase.from('automation_rules').upsert(rows, { onConflict: 'id' })
}
