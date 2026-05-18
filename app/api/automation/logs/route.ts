import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const occasionId = url.searchParams.get('occasionId')
  const organizationId = url.searchParams.get('organizationId')

  let query = supabase.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(50)
  if (occasionId) query = query.eq('occasion_id', occasionId)
  if (organizationId) query = query.eq('organization_id', organizationId)
  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}
