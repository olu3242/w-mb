import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payments/provider'
import { normalizeCurrency } from '@/lib/payments/fees'
import { getPublicSiteUrl } from '@/lib/env'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CheckoutSchema = z.object({
  occasionId: z.string().uuid(),
  sponsorshipCategoryId: z.string().uuid().optional().nullable(),
  contributorName: z.string().min(1).max(120),
  contributorEmail: z.string().email().optional().or(z.literal('')),
  amount: z.coerce.number().min(1),
  currency: z.string().default('USD'),
  message: z.string().max(500).optional().or(z.literal('')),
  isAnonymous: z.boolean().default(false),
})

export async function POST(request: Request) {
  const parsed = CheckoutSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const amount = Math.round(parsed.data.amount * 100)
  const currency = normalizeCurrency(parsed.data.currency)
  const siteUrl = getPublicSiteUrl()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('id, title, is_public')
    .eq('id', parsed.data.occasionId)
    .eq('is_public', true)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (parsed.data.sponsorshipCategoryId) {
    const { data: category } = await admin
      .from('sponsorship_categories')
      .select('id')
      .eq('id', parsed.data.sponsorshipCategoryId)
      .eq('occasion_id', event.id)
      .single()

    if (!category) return NextResponse.json({ error: 'Sponsorship category not found' }, { status: 404 })
  }

  const { data: contribution, error } = await admin
    .from('contributions')
    .insert({
      event_id: event.id,
      occasion_id: event.id,
      sponsorship_category_id: parsed.data.sponsorshipCategoryId ?? null,
      contributor_user_id: user?.id ?? null,
      contributor_name: parsed.data.isAnonymous ? 'Anonymous supporter' : parsed.data.contributorName,
      contributor_email: parsed.data.contributorEmail || null,
      amount,
      currency,
      message: parsed.data.message || null,
      is_anonymous: parsed.data.isAnonymous,
      status: 'pending',
      payment_provider: 'stripe',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const checkout = await getPaymentProvider('stripe').createCheckoutSession({
    contributionId: contribution.id,
    occasionId: event.id,
    title: `${event.title} contribution`,
    amount,
    currency,
    contributorEmail: parsed.data.contributorEmail || null,
    successUrl: `${siteUrl}/payments/success?contribution_id=${contribution.id}`,
    cancelUrl: `${siteUrl}/payments/cancel?contribution_id=${contribution.id}`,
  })

  await admin
    .from('contributions')
    .update({
      provider_checkout_id: checkout.checkoutId,
      provider_payment_intent_id: checkout.paymentIntentId ?? null,
    })
    .eq('id', contribution.id)

  await admin.from('audit_logs').insert({
    actor_id: user?.id ?? null,
    action: 'payment.checkout_created',
    entity_type: 'contribution',
    entity_id: contribution.id,
    metadata: { provider: checkout.provider, checkout_id: checkout.checkoutId },
  })

  return NextResponse.json({ url: checkout.url, contribution_id: contribution.id })
}
