export const SUPPORTED_CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR', 'CAD'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export const LEGACY_CURRENCY_FALLBACK: Record<string, SupportedCurrency> = {
  usd: 'USD',
  ngn: 'NGN',
  gbp: 'GBP',
  eur: 'EUR',
  cad: 'CAD',
}

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD'

const STATIC_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  NGN: 1 / 780,
  GBP: 1.24,
  EUR: 1.08,
  CAD: 0.74,
}

export function normalizeCurrency(value: string): SupportedCurrency {
  const normalized = String(value ?? '').toUpperCase()
  return (LEGACY_CURRENCY_FALLBACK[normalized.toLowerCase() as keyof typeof LEGACY_CURRENCY_FALLBACK] ?? normalized) as SupportedCurrency
}

export function formatCurrency(amount: number, currency: SupportedCurrency = DEFAULT_CURRENCY, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100)
}

export function convertCurrency(amount: number, from: string, to: string): number {
  const source = normalizeCurrency(from)
  const target = normalizeCurrency(to)
  const sourceRate = STATIC_RATES[source] ?? STATIC_RATES.USD
  const targetRate = STATIC_RATES[target] ?? STATIC_RATES.USD
  return Math.round(amount * (sourceRate / targetRate))
}

export function toBaseCurrency(amount: number, currency: string, baseCurrency: string = DEFAULT_CURRENCY) {
  return convertCurrency(amount, currency, baseCurrency)
}
