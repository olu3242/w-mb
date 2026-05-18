import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getSupabaseEnv, getSupabaseServiceRoleKey } from '@/lib/env'

export function createAdminClient() {
  const { url } = getSupabaseEnv()

  return createClient<Database, 'public', 'public'>(
    url!,
    getSupabaseServiceRoleKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
