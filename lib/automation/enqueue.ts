import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import { logActivity } from '@/lib/ops/activity'
import { listMatchingRules } from './rules'
import { logAutomation } from './audit'
import type { AutomationEventInput } from './types'

export async function enqueueAutomationEvent(
  supabase: SupabaseClient<Database, 'public'>,
  input: AutomationEventInput,
) {
  let eventId: string | null = null

  if (input.occasionId && input.sourceId) {
    const { data: existing } = await supabase
      .from('automation_events')
      .select('id')
      .eq('occasion_id', input.occasionId)
      .eq('event_type', input.eventType)
      .eq('source_id', input.sourceId)
      .maybeSingle()
    eventId = existing?.id ?? null
  }

  if (!eventId) {
    const { data, error } = await supabase
      .from('automation_events')
      .insert({
        organization_id: input.organizationId ?? null,
        occasion_id: input.occasionId ?? null,
        source_type: input.sourceType,
        source_id: input.sourceId ?? null,
        event_type: input.eventType,
        payload: input.payload ?? {},
        status: 'new',
      })
      .select('id')
      .single()
    if (error) throw error
    eventId = data.id
  }

  const rules = await listMatchingRules(supabase, input)
  let queued = 0

  for (const rule of rules) {
    const { data: existingQueue } = await supabase
      .from('automation_queue')
      .select('id')
      .eq('automation_event_id', eventId)
      .eq('automation_rule_id', rule.id)
      .maybeSingle()

    if (existingQueue) continue

    await supabase.from('automation_queue').insert({
      automation_event_id: eventId,
      automation_rule_id: rule.id,
      organization_id: input.organizationId ?? rule.organization_id ?? null,
      occasion_id: input.occasionId ?? rule.occasion_id ?? null,
      action_type: rule.action_type,
      payload: {
        event: input,
        rule: {
          id: rule.id,
          title: rule.title,
          description: rule.description,
          suggestedAction: rule.suggested_action,
          actionPayload: rule.action_payload,
        },
      } as Json,
      status: 'pending',
      run_after: new Date().toISOString(),
    })
    queued += 1
  }

  if (input.occasionId && queued > 0) {
    await logActivity(supabase, {
      occasionId: input.occasionId,
      activityType: 'automation.enqueued',
      title: `${queued} automation ${queued === 1 ? 'action' : 'actions'} queued`,
      body: input.eventType.replace(/_/g, ' '),
      metadata: { eventId, eventType: input.eventType, sourceId: input.sourceId ?? null },
    })
  }

  await logAutomation(supabase, {
    organizationId: input.organizationId ?? null,
    occasionId: input.occasionId ?? null,
    actionType: 'enqueue',
    status: queued > 0 ? 'queued' : 'skipped',
    message: `${queued} automation actions queued for ${input.eventType}`,
    metadata: { eventId, eventType: input.eventType },
  })

  return { eventId, queued }
}
