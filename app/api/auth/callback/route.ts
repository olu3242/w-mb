import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function getSafeNextPath(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next')

  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard'
  }

  return next
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const redirectTo = new URL(getSafeNextPath(request), request.url)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(redirectTo)
    }
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('error', 'Unable to confirm your session. Please sign in again.')
  return NextResponse.redirect(loginUrl)
}
