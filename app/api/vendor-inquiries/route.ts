import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/ops/activity'
import { createAdminClient } from '@/lib/supabase/admin'
import { enqueueAutomationEvent } from '@/lib/automation/enqueue'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const VendorInquirySchema = z.object({
  occasion_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  message: z.string().min(2).max(1000),
  event_date: z.string().datetime().optional().nullable(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = VendorInquirySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: event } = await supabase
    .from('events')
    .select('id, owner_id')
    .eq('id', parsed.data.occasion_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('vendor_inquiries')
    .insert({
      occasion_id: event.id,
      vendor_id: parsed.data.vendor_id,
      organizer_id: user.id,
      message: parsed.data.message,
      event_date: parsed.data.event_date ?? null,
      status: 'new',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    occasionId: event.id,
    actorId: user.id,
    activityType: 'vendor.inquiry_submitted',
    title: 'Vendor quote requested',
    body: parsed.data.message,
    entityType: 'vendor_inquiry',
    entityId: data.id,
  })
  await enqueueAutomationEvent(createAdminClient(), {
    occasionId: event.id,
    sourceType: 'vendor_inquiry',
    sourceId: data.id,
    eventType: 'vendor_inquiry_created',
    payload: { vendorId: parsed.data.vendor_id, message: parsed.data.message },
  })

  return NextResponse.json(data, { status: 201 })
}
