import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeServer, getStripeWebhookSecret } from '@/lib/payments/stripe'
import { getResendClient } from '@/lib/resend/client'
import { logActivity } from '@/lib/ops/activity'
import { enqueueAutomationEvent } from '@/lib/automation/enqueue'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import type { Json } from '@/types/database'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripeServer().webhooks.constructEvent(rawBody, signature, getStripeWebhookSecret())
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('payment_events')
    .select('id, processed_at')
    .eq('provider_event_id', event.id)
    .single()

  if (existing?.processed_at) return NextResponse.json({ received: true, duplicate: true })

  const { data: paymentEvent, error: eventInsertError } = await admin
    .from('payment_events')
    .insert({
      provider: 'stripe',
      provider_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Json,
    })
    .select('id')
    .single()

  const paymentEventId = existing?.id ?? paymentEvent?.id
  if (eventInsertError && !paymentEventId) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    await handleStripeEvent(event)
    if (paymentEventId) {
      await admin.from('payment_events').update({ processed_at: new Date().toISOString(), processing_error: null }).eq('id', paymentEventId)
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    if (paymentEventId) {
      await admin.from('payment_events').update({ processing_error: message }).eq('id', paymentEventId)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await markCheckoutSessionPaid(event.data.object as Stripe.Checkout.Session)
      break
    case 'payment_intent.succeeded':
      await markPaymentIntentPaid(event.data.object as Stripe.PaymentIntent)
      break
    case 'payment_intent.payment_failed':
      await markPaymentIntentStatus(event.data.object as Stripe.PaymentIntent, 'failed')
      break
    case 'charge.refunded':
      await markChargeStatus(event.data.object as Stripe.Charge, 'refunded')
      break
    case 'charge.dispute.created':
      await markDisputeStatus(event.data.object as Stripe.Dispute)
      break
  }
}

async function markCheckoutSessionPaid(session: Stripe.Checkout.Session) {
  const contributionId = session.metadata?.contribution_id
  if (!contributionId) return
  await markContributionPaid(contributionId, typeof session.payment_intent === 'string' ? session.payment_intent : null)
}

async function markPaymentIntentPaid(intent: Stripe.PaymentIntent) {
  const contributionId = intent.metadata?.contribution_id
  if (!contributionId) return
  await markContributionPaid(contributionId, intent.id)
}

async function markPaymentIntentStatus(intent: Stripe.PaymentIntent, status: 'failed') {
  const contributionId = intent.metadata?.contribution_id
  if (!contributionId) return

  const admin = createAdminClient()
  await admin
    .from('contributions')
    .update({ status, provider_payment_intent_id: intent.id })
    .eq('id', contributionId)
    .neq('status', 'paid')
  await admin.from('audit_logs').insert({
    action: `payment.${status}`,
    entity_type: 'contribution',
    entity_id: contributionId,
    metadata: { provider: 'stripe', payment_intent_id: intent.id },
  })
}

async function markChargeStatus(charge: Stripe.Charge, status: 'refunded' | 'disputed') {
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
  if (!paymentIntentId) return

  const admin = createAdminClient()
  const { data: contribution } = await admin
    .from('contributions')
    .select('id, occasion_id, amount, currency, status')
    .eq('provider_payment_intent_id', paymentIntentId)
    .single()

  if (!contribution) return

  await admin.from('contributions').update({
    status,
    refunded_at: status === 'refunded' ? new Date().toISOString() : null,
  }).eq('id', contribution.id)

  await admin.from('transactions').insert({
    occasion_id: contribution.occasion_id,
    contribution_id: contribution.id,
    provider: 'stripe',
    provider_transaction_id: charge.id,
    transaction_type: status === 'refunded' ? 'refund' : 'adjustment',
    amount: contribution.amount,
    currency: contribution.currency,
    status,
    metadata: { payment_intent_id: paymentIntentId },
  })

  await admin.from('audit_logs').insert({
    action: `payment.${status}`,
    entity_type: 'contribution',
    entity_id: contribution.id,
    metadata: { provider: 'stripe', charge_id: charge.id, payment_intent_id: paymentIntentId },
  })
}

async function markDisputeStatus(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
  if (!chargeId) return
  const charge = await getStripeServer().charges.retrieve(chargeId)
  await markChargeStatus(charge, 'disputed')
}

async function markContributionPaid(contributionId: string, paymentIntentId: string | null) {
  const admin = createAdminClient()
  const { data: contribution } = await admin
    .from('contributions')
    .select('id, occasion_id, sponsorship_category_id, contributor_email, contributor_name, amount, currency, status')
    .eq('id', contributionId)
    .single()

  if (!contribution || contribution.status === 'paid') return

  const paidAt = new Date().toISOString()
  await admin.from('contributions').update({
    status: 'paid',
    paid_at: paidAt,
    provider_payment_intent_id: paymentIntentId,
  }).eq('id', contribution.id)

  if (contribution.sponsorship_category_id) {
    await admin.rpc('increment_sponsorship_funded_amount_once', {
      p_category_id: contribution.sponsorship_category_id,
      p_amount: contribution.amount,
    })
  }

  await admin.from('transactions').insert({
    occasion_id: contribution.occasion_id,
    contribution_id: contribution.id,
    provider: 'stripe',
    provider_transaction_id: paymentIntentId,
    transaction_type: 'contribution',
    amount: contribution.amount,
    currency: contribution.currency,
    status: 'paid',
    metadata: {},
  })

  await admin.from('audit_logs').insert({
    action: 'payment.paid',
    entity_type: 'contribution',
    entity_id: contribution.id,
    metadata: { provider: 'stripe', payment_intent_id: paymentIntentId },
  })

  await logActivity(admin, {
    occasionId: contribution.occasion_id,
    activityType: 'contribution.paid',
    title: 'Contribution received',
    body: `${(contribution.amount / 100).toFixed(2)} ${contribution.currency}`,
    entityType: 'contribution',
    entityId: contribution.id,
  })

  await sendReceipt(contribution)
  await enqueueAutomationEvent(admin, {
    occasionId: contribution.occasion_id,
    sourceType: 'contribution',
    sourceId: contribution.id,
    eventType: 'contribution_paid',
    payload: {
      amount: contribution.amount,
      currency: contribution.currency,
      contributorName: contribution.contributor_name,
    },
  })
}

async function sendReceipt(contribution: {
  contributor_email: string | null
  contributor_name: string
  amount: number
  currency: string
}) {
  const resend = getResendClient()
  if (!resend || !contribution.contributor_email) {
    console.info('Receipt email skipped: Resend or contributor email not configured')
    return
  }

  await resend.emails.send({
    from: 'Owambe OS <receipts@owambe.app>',
    to: contribution.contributor_email,
    subject: 'Your Owambe OS contribution receipt',
    text: `Thank you, ${contribution.contributor_name}. Your contribution of ${(contribution.amount / 100).toFixed(2)} ${contribution.currency} was received.`,
  })
}
