import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeServer } from '@/lib/stripe/client'
import { ContributionSchema } from '@/lib/validations'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const stripe = getStripeServer()
  const body = await request.json()
  const parsed = ContributionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, stripe_account_id')
    .eq('id', parsed.data.event_id)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (!event.stripe_account_id) {
    return NextResponse.json({ error: 'Event is not set up to receive payments' }, { status: 400 })
  }

  const platformFee = Math.round(parsed.data.amount * 0.029 + 30)

  const paymentIntent = await stripe.paymentIntents.create({
    amount: parsed.data.amount,
    currency: 'usd',
    application_fee_amount: platformFee,
    transfer_data: { destination: event.stripe_account_id },
    metadata: {
      event_id: parsed.data.event_id,
      gift_item_id: parsed.data.gift_item_id ?? '',
      contributor_name: parsed.data.contributor_name,
      contributor_email: parsed.data.contributor_email,
      message: parsed.data.message ?? '',
    },
  })

  const { data: contribution, error } = await admin
    .from('contributions')
    .insert({
      event_id: parsed.data.event_id,
      occasion_id: parsed.data.event_id,
      gift_item_id: parsed.data.gift_item_id ?? null,
      amount: parsed.data.amount,
      contributor_name: parsed.data.contributor_name,
      contributor_email: parsed.data.contributor_email,
      message: parsed.data.message ?? null,
      stripe_payment_intent_id: paymentIntent.id,
      payment_provider: 'stripe',
      provider_payment_intent_id: paymentIntent.id,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    client_secret: paymentIntent.client_secret,
    contribution_id: contribution.id,
  })
}
