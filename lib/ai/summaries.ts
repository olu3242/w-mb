import type { OccasionIntelligenceContext } from '@/lib/ai/context'

export function generateEventSummary(context: OccasionIntelligenceContext): string {
  const { metrics } = context
  const risks: string[] = []

  if (metrics.tasksOverdue > 0) {
    risks.push(`${metrics.tasksOverdue} overdue task${metrics.tasksOverdue === 1 ? '' : 's'}`)
  }
  if (metrics.timelineOverdue > 0) {
    risks.push(`${metrics.timelineOverdue} overdue milestone${metrics.timelineOverdue === 1 ? '' : 's'}`)
  }
  if (metrics.fundingTarget > 0 && metrics.fundingProgress < 70) {
    risks.push(`funding is ${metrics.fundingProgress}% of the goal`)
  }
  if (metrics.committeeRoles > 0 && metrics.committeeAssignedRoles < metrics.committeeRoles) {
    risks.push('committee roles are not fully assigned')
  }

  if (risks.length === 0) {
    return 'Your event planning is progressing well. Budget health is stable and the core operations are on track.'
  }

  return `Your event is making progress, but ${risks.join(', ')}. Focus on these areas to keep the plan moving.`
}

export function getInsightFeed(context: OccasionIntelligenceContext): string[] {
  const { metrics } = context
  const insights: string[] = []

  if (metrics.tasksOverdue > 0) {
    insights.push(`${metrics.tasksOverdue} task${metrics.tasksOverdue === 1 ? '' : 's'} are overdue.`)
  }
  if (metrics.tasksUnassigned > 0) {
    insights.push(`${metrics.tasksUnassigned} open task${metrics.tasksUnassigned === 1 ? '' : 's'} need assignment.`)
  }
  if (metrics.fundingTarget > 0) {
    insights.push(`Funding is at ${metrics.fundingProgress}% of the target.`)
  }
  if (metrics.vendorNeeds > 0 && metrics.vendorInquiryCount === 0) {
    insights.push('No vendor inquiries have been sent for required vendor categories.')
  }
  if (metrics.guestCount === 0) {
    insights.push('No RSVP invites have been created yet.')
  }
  if (metrics.timelineOverdue > 0) {
    insights.push(`${metrics.timelineOverdue} milestone${metrics.timelineOverdue === 1 ? '' : 's'} are overdue.`)
  }
  if (metrics.committeeRoles > 0 && metrics.committeeAssignedRoles === metrics.committeeRoles) {
    insights.push('Committee coordination is healthy.')
  }

  return insights.length > 0 ? insights.slice(0, 5) : ['No urgent issues detected. The event operations are in a stable state.']
}
