import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

let _stripe: Stripe | null = null
export function getStripeServer(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY')
  if (!_stripe) _stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' })
  return _stripe
}

export const getStripe = () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
  return loadStripe(publishableKey)
}
