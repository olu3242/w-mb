import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const LeadSchema = z.object({
  vendorId: z.string().uuid(),
  inquiryId: z.string().uuid().optional().nullable(),
  stage: z.enum(['new', 'contacted', 'quoted', 'won', 'lost']).default('new'),
  estimatedValue: z.coerce.number().min(0).default(0),
  note: z.string().max(1000).optional().or(z.literal('')),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = LeadSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: lead, error } = await supabase
    .from('vendor_leads')
    .insert({
      vendor_id: parsed.data.vendorId,
      inquiry_id: parsed.data.inquiryId ?? null,
      stage: parsed.data.stage,
      estimated_value: Math.round(parsed.data.estimatedValue * 100),
      last_contacted_at: parsed.data.stage === 'contacted' ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (parsed.data.note) {
    await supabase.from('vendor_crm_notes').insert({
      vendor_id: parsed.data.vendorId,
      inquiry_id: parsed.data.inquiryId ?? null,
      owner_id: user.id,
      note: parsed.data.note,
    })
  }

  return NextResponse.json(lead, { status: 201 })
}
