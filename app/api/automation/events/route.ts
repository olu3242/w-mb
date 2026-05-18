import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueAutomationEvent } from '@/lib/automation/enqueue'
import { canAccessAutomationScope } from '@/lib/automation/security'
import type { Json } from '@/types/database'

const Schema = z.object({
  organizationId: z.string().uuid().optional().nullable(),
  occasionId: z.string().uuid().optional().nullable(),
  sourceType: z.string().default('system'),
  sourceId: z.string().uuid().optional().nullable(),
  eventType: z.string(),
  payload: z.record(z.unknown()).optional(),
})

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = await canAccessAutomationScope(supabase, user, {
    occasionId: parsed.data.occasionId,
    organizationId: parsed.data.organizationId,
  })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const result = await enqueueAutomationEvent(createAdminClient(), {
    organizationId: parsed.data.organizationId,
    occasionId: parsed.data.occasionId,
    sourceType: parsed.data.sourceType as never,
    sourceId: parsed.data.sourceId,
    eventType: parsed.data.eventType as never,
    payload: (parsed.data.payload ?? {}) as Json,
  })
  return NextResponse.json(result)
}
