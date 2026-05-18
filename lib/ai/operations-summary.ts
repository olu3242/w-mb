import type { OccasionIntelligenceContext } from './context'

export type OperationsSummary = {
  headline: string
  status: 'on_track' | 'attention_needed' | 'critical'
  bullets: string[]
}

export function generateOperationsSummary(context: OccasionIntelligenceContext): OperationsSummary {
  const warnings = [] as string[]

  if (context.metrics.tasksOverdue > 0) {
    warnings.push(`There are ${context.metrics.tasksOverdue} overdue tasks that need immediate attention.`)
  }

  if (context.metrics.budgetOverruns > 0) {
    warnings.push(`Budget overruns detected in ${context.metrics.budgetOverruns} spending categories.`)
  }

  if (context.metrics.vendorNeeds > 0 && context.metrics.vendorInquiryCount === 0) {
    warnings.push('Required vendor categories still need active inquiries.')
  }

  if (context.metrics.fundingProgress < 70) {
    warnings.push(`Funding is at ${context.metrics.fundingProgress}% of the goal; focus on closing the remaining gap.`)
  }

  const headline = warnings.length
    ? 'Operational focus areas identified'
    : 'Event operations are tracking well'

  const status = warnings.length > 1 ? 'attention_needed' : warnings.length === 1 ? 'attention_needed' : 'on_track'

  const defaultBullets = [
    `Event date: ${context.eventDate ?? 'unspecified'}`,
    `Open tasks: ${context.metrics.tasksOpen}`,
    `RSVPs accepted: ${context.metrics.rsvpAccepted}`,
  ]

  return {
    headline,
    status,
    bullets: warnings.length ? warnings.concat(defaultBullets) : defaultBullets,
  }
}
