import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ count: pending }, { count: failed }, { count: processed }, { count: rules }] = await Promise.all([
    supabase.from('automation_queue').select('*', { count: 'exact', head: true }).in('status', ['pending', 'queued']),
    supabase.from('automation_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('automation_queue').select('*', { count: 'exact', head: true }).eq('status', 'processed'),
    supabase.from('automation_rules').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  return NextResponse.json({ pending, failed, processed, activeRules: rules })
}
