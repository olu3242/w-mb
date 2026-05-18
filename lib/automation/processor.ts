import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { executeAutomationAction } from './actions'
import { logAutomation } from './audit'
import type { AutomationProcessResult, AutomationQueueRecord } from './types'

export async function processAutomationQueue(
  supabase: SupabaseClient<Database, 'public'>,
  options: { limit?: number } = {},
): Promise<AutomationProcessResult> {
  const limit = options.limit ?? 20
  const { data } = await supabase
    .from('automation_queue')
    .select('*')
    .in('status', ['pending', 'queued', 'failed'])
    .lte('run_after', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(limit)

  const items = ((data ?? []) as AutomationQueueRecord[])
    .filter(item => !item.locked_at && (item.attempts ?? 0) < (item.max_attempts ?? 3))

  let processed = 0
  let failed = 0
  let skipped = Math.max(0, (data?.length ?? 0) - items.length)

  for (const item of items) {
    const lockedAt = new Date().toISOString()
    const attempts = (item.attempts ?? 0) + 1
    const { error: lockError } = await supabase
      .from('automation_queue')
      .update({ status: 'processing', locked_at: lockedAt, attempts })
      .eq('id', item.id)
      .is('locked_at', null)

    if (lockError) {
      skipped += 1
      continue
    }

    try {
      await executeAutomationAction(supabase, { ...item, attempts, locked_at: lockedAt })
      await supabase
        .from('automation_queue')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          locked_at: null,
          error_message: null,
        })
        .eq('id', item.id)
      await logAutomation(supabase, {
        queueId: item.id,
        organizationId: item.organization_id,
        occasionId: item.occasion_id,
        actionType: item.action_type,
        status: 'processed',
        message: 'Automation action processed.',
      })
      processed += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Automation action failed'
      const exhausted = attempts >= (item.max_attempts ?? 3)
      await supabase
        .from('automation_queue')
        .update({
          status: exhausted ? 'failed' : 'pending',
          locked_at: null,
          error_message: message,
          run_after: new Date(Date.now() + Math.min(attempts, 5) * 60_000).toISOString(),
        })
        .eq('id', item.id)
      await logAutomation(supabase, {
        queueId: item.id,
        organizationId: item.organization_id,
        occasionId: item.occasion_id,
        actionType: item.action_type,
        status: 'failed',
        message,
      })
      failed += 1
    }
  }

  return { processed, failed, skipped }
}
