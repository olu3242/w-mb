import type { PaymentProvider, PaymentProviderName } from './types'
import { stripeProvider } from './stripe'

export function getPaymentProvider(name: PaymentProviderName = 'stripe'): PaymentProvider {
  switch (name) {
    case 'stripe':
      return stripeProvider
    default:
      throw new Error(`${name} payments are not enabled yet`)
  }
}
