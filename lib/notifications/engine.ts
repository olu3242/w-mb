import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export async function queueNotification(
  supabase: SupabaseClient<Database, 'public'>,
  input: {
    occasionId?: string | null
    recipientUserId?: string | null
    recipientEmail?: string | null
    channel?: 'in_app' | 'email' | 'whatsapp_ready'
    notificationType: string
    title: string
    body?: string | null
    metadata?: Json
  },
) {
  await supabase.from('notifications').insert({
    occasion_id: input.occasionId ?? null,
    recipient_user_id: input.recipientUserId ?? null,
    recipient_email: input.recipientEmail ?? null,
    channel: input.channel ?? 'in_app',
    notification_type: input.notificationType,
    title: input.title,
    body: input.body ?? null,
    metadata: input.metadata ?? {},
  })
}
