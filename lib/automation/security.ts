import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function isSupportAdmin(supabase: SupabaseClient<Database, 'public'>, userId: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  return ['admin', 'support'].includes(data?.role)
}

export async function canAccessAutomationScope(
  supabase: SupabaseClient<Database, 'public'>,
  user: User,
  input: { occasionId?: string | null; organizationId?: string | null },
) {
  if (await isSupportAdmin(supabase, user.id)) return true

  if (input.occasionId) {
    const { data: event } = await supabase.from('events').select('owner_id').eq('id', input.occasionId).maybeSingle()
    if (event?.owner_id === user.id) return true

    const { data: organizer } = await supabase
      .from('event_organizers')
      .select('id')
      .eq('event_id', input.occasionId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (organizer) return true
  }

  if (input.organizationId) {
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', input.organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    if (member) return true
  }

  return false
}
