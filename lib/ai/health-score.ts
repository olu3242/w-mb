import type { OccasionIntelligenceContext } from '@/lib/ai/context'

export type HealthScoreResult = {
  overall: number
  scores: {
    tasks: number
    rsvp: number
    funding: number
    vendors: number
    budget: number
    timeline: number
    committee: number
  }
  topRisks: string[]
  topStrengths: string[]
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function calculateHealthScore(context: OccasionIntelligenceContext): HealthScoreResult {
  const { metrics } = context
  const taskScore = metrics.taskCount === 0 ? 100 : clamp((metrics.tasksCompleted / metrics.taskCount) * 100 - metrics.tasksOverdue * 5)

  const rsvpScore = metrics.guestCount === 0
    ? 40
    : clamp(Math.min(100, metrics.rsvpAccepted * 10 + (metrics.rsvpMaybe * 3) - metrics.rsvpDeclined * 5))

  const fundingScore = metrics.fundingTarget === 0
    ? 100
    : clamp(metrics.fundingProgress + (metrics.fundedTotal >= metrics.fundingTarget ? 0 : -10))

  const vendorScore = metrics.vendorNeeds === 0
    ? 100
    : clamp(40 + Math.min(60, metrics.vendorInquiryCount * 20))

  const budgetScore = metrics.budgetCategories === 0
    ? 100
    : clamp(80 - metrics.budgetOverruns * 20)

  const timelineScore = metrics.timelineCount === 0
    ? 100
    : clamp(80 - metrics.timelineOverdue * 25 - Math.max(0, metrics.upcomingMilestones - 1) * 5)

  const committeeScore = metrics.committeeRoles === 0
    ? 70
    : clamp((metrics.committeeAssignedRoles / metrics.committeeRoles) * 100)

  const overall = clamp(
    taskScore * 0.2 +
    rsvpScore * 0.15 +
    fundingScore * 0.2 +
    vendorScore * 0.15 +
    budgetScore * 0.1 +
    timelineScore * 0.1 +
    committeeScore * 0.1,
  )

  const topRisks: string[] = []
  if (metrics.tasksOverdue > 0) topRisks.push(`${metrics.tasksOverdue} overdue task${metrics.tasksOverdue === 1 ? '' : 's'}`)
  if (metrics.timelineOverdue > 0) topRisks.push(`${metrics.timelineOverdue} overdue milestone${metrics.timelineOverdue === 1 ? '' : 's'}`)
  if (metrics.fundingTarget > 0 && metrics.fundingProgress < 50) topRisks.push('Funding is below 50%')
  if (metrics.budgetOverruns > 0) topRisks.push(`${metrics.budgetOverruns} overspending category${metrics.budgetOverruns === 1 ? '' : 'ies'}`)
  if (metrics.committeeRoles > 0 && metrics.committeeAssignedRoles < metrics.committeeRoles) topRisks.push('Committee assignments need attention')
  if (metrics.vendorNeeds > 0 && metrics.vendorInquiryCount === 0) topRisks.push('Vendor inquiries are missing')

  const topStrengths: string[] = []
  if (metrics.fundingProgress >= 80) topStrengths.push('Funding is on track')
  if (metrics.tasksCompleted > 0 && taskScore >= 70) topStrengths.push('Task completion is steady')
  if (metrics.rsvpAccepted > 0) topStrengths.push('RSVP momentum is building')
  if (metrics.committeeAssignedRoles === metrics.committeeRoles && metrics.committeeRoles > 0) topStrengths.push('Committee coordination is strong')
  if (metrics.timelineOverdue === 0 && metrics.upcomingMilestones === 0 && metrics.timelineCount > 0) topStrengths.push('Timeline is up to date')

  return {
    overall,
    scores: {
      tasks: taskScore,
      rsvp: rsvpScore,
      funding: fundingScore,
      vendors: vendorScore,
      budget: budgetScore,
      timeline: timelineScore,
      committee: committeeScore,
    },
    topRisks,
    topStrengths,
  }
}
