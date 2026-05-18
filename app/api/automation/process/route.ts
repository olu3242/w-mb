import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processAutomationQueue } from '@/lib/automation/processor'
import { isSupportAdmin } from '@/lib/automation/security'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cronSecret = request.headers.get('x-cron-secret')
  const cronAllowed = Boolean(process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET)
  const adminAllowed = user ? await isSupportAdmin(supabase, user.id) : false

  if (!cronAllowed && !adminAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const result = await processAutomationQueue(createAdminClient(), { limit: 25 })
  return NextResponse.json(result)
}
