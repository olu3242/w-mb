import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export async function logActivity(
  supabase: SupabaseClient<Database, 'public'>,
  input: {
    occasionId: string
    actorId?: string | null
    activityType: string
    title: string
    body?: string | null
    visibility?: 'organizers' | 'committee' | 'public'
    entityType?: string | null
    entityId?: string | null
    metadata?: Json
  },
) {
  await supabase.from('activity_feed').insert({
    occasion_id: input.occasionId,
    actor_id: input.actorId ?? null,
    activity_type: input.activityType,
    title: input.title,
    body: input.body ?? null,
    visibility: input.visibility ?? 'organizers',
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  })
}
