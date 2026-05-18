import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { OccasionIntelligenceContext } from '../context'
import { buildEventMemorySnapshot } from './storage'

export { buildEventMemorySnapshot } from './storage'

export async function saveEventMemorySnapshot(
  supabase: SupabaseClient<Database, 'public'>,
  context: OccasionIntelligenceContext,
  memory: ReturnType<typeof buildEventMemorySnapshot>,
  userId?: string | null,
) {
  await supabase.from('ai_memory_snapshots').insert({
    occasion_id: context.occasionId,
    memory_type: 'event_snapshot',
    summary: memory.summary,
    payload: memory,
    created_by: userId ?? null,
  })
}

export async function loadRecentEventMemory(
  supabase: SupabaseClient<Database, 'public'>,
  occasionId: string,
) {
  const { data } = await supabase
    .from('ai_memory_snapshots')
    .select('id, summary, payload, created_at')
    .eq('occasion_id', occasionId)
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

export async function recordOrchestrationLog(
  supabase: SupabaseClient<Database, 'public'>,
  occasionId: string,
  message: string,
  level: 'info' | 'warning' | 'critical' = 'info',
  metadata?: Json,
) {
  await supabase.from('orchestration_logs').insert({
    occasion_id: occasionId,
    source: 'ai_assistant',
    level,
    message,
    metadata: metadata ?? {},
  })
}
