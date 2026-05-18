import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { getSupabaseEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { url, anonKey } = getSupabaseEnv()

  const supabase = createServerClient<Database, 'public'>(url!, anonKey!, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/events']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))
  const isAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup'

  if (!user && isProtected) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}
