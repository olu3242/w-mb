import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scanTimeBasedAutomationEvents } from '@/lib/automation/evaluator'
import { processAutomationQueue } from '@/lib/automation/processor'
import { ensureDefaultAutomationRules } from '@/lib/automation/rules'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  await ensureDefaultAutomationRules(admin)
  const scan = await scanTimeBasedAutomationEvents(admin)
  const processed = await processAutomationQueue(admin, { limit: 50 })
  return NextResponse.json({ queued: scan.queued, ...processed })
}
