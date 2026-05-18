export function estimatePlatformFee(amount: number) {
  return Math.round(amount * 0.029 + 30)
}

export function normalizeCurrency(currency?: string | null) {
  return (currency || 'USD').toUpperCase()
}
