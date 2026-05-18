import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export async function logAutomation(
  supabase: SupabaseClient<Database, 'public'>,
  input: {
    queueId?: string | null
    organizationId?: string | null
    occasionId?: string | null
    actionType: string
    status: string
    message?: string | null
    metadata?: Json
  },
) {
  await supabase.from('automation_logs').insert({
    queue_id: input.queueId ?? null,
    organization_id: input.organizationId ?? null,
    occasion_id: input.occasionId ?? null,
    action_type: input.actionType,
    status: input.status,
    message: input.message ?? null,
    metadata: input.metadata ?? {},
    level: input.status === 'failed' ? 'error' : 'info',
  })
}
