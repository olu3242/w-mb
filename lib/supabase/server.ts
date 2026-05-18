import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getSupabaseEnv } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient<Database, 'public'>(url!, anonKey!, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components cannot set cookies, but Route Handlers and Server Actions can.
        }
      },
    },
  })
}
