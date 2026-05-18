export type PaymentProviderName = 'stripe' | 'paystack' | 'flutterwave' | 'mobile_money'

export type CheckoutInput = {
  contributionId: string
  occasionId: string
  title: string
  amount: number
  currency: string
  contributorEmail?: string | null
  successUrl: string
  cancelUrl: string
}

export type CheckoutSession = {
  provider: PaymentProviderName
  checkoutId: string
  paymentIntentId?: string | null
  url: string
}

export type PaymentProvider = {
  name: PaymentProviderName
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession>
}
