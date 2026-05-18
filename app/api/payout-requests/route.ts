import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { scorePayoutRequest, trustMetadata } from '@/lib/payments/trust'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const PayoutRequestSchema = z.object({
  occasionId: z.string().uuid(),
  amount: z.coerce.number().min(1),
  currency: z.string().default('USD'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = PayoutRequestSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createAdminClient()
  const amount = Math.round(parsed.data.amount * 100)
  const { data: event } = await admin
    .from('events')
    .select('id, owner_id')
    .eq('id', parsed.data.occasionId)
    .single()

  if (!event || event.owner_id !== user.id) {
    return NextResponse.json({ error: 'Only the event owner can request payouts in this MVP' }, { status: 403 })
  }

  const { data: paidRows } = await admin
    .from('contributions')
    .select('amount')
    .eq('occasion_id', event.id)
    .eq('status', 'paid')

  const { data: existingPayouts } = await admin
    .from('payout_requests')
    .select('amount')
    .eq('occasion_id', event.id)
    .in('status', ['pending_review', 'approved', 'paid'])

  const paidTotal = paidRows?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0
  const requestedTotal = existingPayouts?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0
  const available = paidTotal - requestedTotal

  if (amount > available) {
    return NextResponse.json({ error: 'Requested amount exceeds available paid balance' }, { status: 400 })
  }

  const trust = await scorePayoutRequest(admin, { occasionId: event.id, requestedAmount: amount })
  const status = trust.decision === 'block' ? 'rejected' : 'pending_review'
  const { data: review } = await admin
    .from('admin_reviews')
    .insert({
      subject_type: 'payout_request',
      review_type: 'payout_trust',
      status: 'open',
      priority: trust.decision === 'block' ? 'high' : 'medium',
      notes: trust.reasons.join(', '),
    })
    .select('id')
    .single()

  const { data: payout, error } = await admin
    .from('payout_requests')
    .insert({
      occasion_id: event.id,
      requested_by: user.id,
      amount,
      currency: parsed.data.currency.toUpperCase(),
      status,
      trust_status: trust.decision,
      admin_review_id: review?.id ?? null,
      rejected_at: trust.decision === 'block' ? new Date().toISOString() : null,
      rejection_reason: trust.decision === 'block' ? trust.reasons.join(', ') : null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (review?.id) {
    await admin.from('admin_reviews').update({ subject_id: payout.id }).eq('id', review.id)
  }

  await admin.from('audit_logs').insert({
    actor_id: user.id,
    action: 'payout.requested',
    entity_type: 'payout_request',
    entity_id: payout.id,
    metadata: trustMetadata(trust),
  })

  return NextResponse.json({ id: payout.id, status, trust_status: trust.decision }, { status: 201 })
}
