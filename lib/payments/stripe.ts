import Stripe from 'stripe'
import type { CheckoutInput, PaymentProvider } from './types'

let stripe: Stripe | null = null

export function getStripeServer() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY')

  if (!stripe) {
    stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' })
  }

  return stripe
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  return secret
}

export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  async createCheckoutSession(input: CheckoutInput) {
    const session = await getStripeServer().checkout.sessions.create({
      mode: 'payment',
      customer_email: input.contributorEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.amount,
            product_data: {
              name: input.title,
              description: 'Owambe OS event contribution',
            },
          },
        },
      ],
      metadata: {
        contribution_id: input.contributionId,
        occasion_id: input.occasionId,
      },
      payment_intent_data: {
        metadata: {
          contribution_id: input.contributionId,
          occasion_id: input.occasionId,
        },
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    })

    if (!session.url) throw new Error('Stripe did not return a Checkout URL')

    return {
      provider: 'stripe',
      checkoutId: session.id,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      url: session.url,
    }
  },
}
