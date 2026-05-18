import type { OccasionIntelligenceContext } from './context'
import { convertCurrency, normalizeCurrency } from '../currency'

export type EventAnalytics = {
  grossMerchandiseVolume: number
  currency: string
  topContributionCurrencies: string[]
  vendorCount: number
  committeeCoverage: number
  rsvpResponseRate: number
  operationalAlerts: number
}

export function buildEventAnalytics(context: OccasionIntelligenceContext): EventAnalytics {
  const contributionsByCurrency = context.contributions.reduce<Record<string, number>>((map, contribution) => {
    const currency = normalizeCurrency(contribution.currency ?? 'USD')
    map[currency] = (map[currency] ?? 0) + contribution.amount
    return map
  }, {})

  const gmv = Object.entries(contributionsByCurrency).reduce((sum, [currency, amount]) => {
    return sum + convertCurrency(amount, currency, context.eventCurrency ?? 'USD')
  }, 0)

  const topContributionCurrencies = Object.entries(contributionsByCurrency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([currency]) => currency)

  const rsvpCount = context.metrics.guestCount
  const responded = context.metrics.rsvpAccepted + context.metrics.rsvpMaybe + context.metrics.rsvpDeclined
  const rsvpResponseRate = rsvpCount === 0 ? 0 : Math.round((responded / rsvpCount) * 100)

  return {
    grossMerchandiseVolume: gmv,
    currency: context.eventCurrency ?? 'USD',
    topContributionCurrencies,
    vendorCount: context.metrics.vendorNeeds,
    committeeCoverage: context.metrics.committeeRoles === 0 ? 100 : Math.round((context.metrics.committeeAssignedRoles / context.metrics.committeeRoles) * 100),
    rsvpResponseRate,
    operationalAlerts: context.metrics.tasksOverdue + context.metrics.timelineOverdue + context.metrics.budgetOverruns,
  }
}
