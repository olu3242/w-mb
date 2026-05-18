import type { OccasionIntelligenceContext } from '@/lib/ai/context'

export type RecommendationType = 'info' | 'suggestion' | 'warning' | 'critical'

export type Recommendation = {
  id: string
  type: RecommendationType
  title: string
  recommendation: string
  reason: string
  priority: 'low' | 'medium' | 'high'
}

export function getRecommendations(context: OccasionIntelligenceContext): Recommendation[] {
  const recommendations: Recommendation[] = []
  const { metrics } = context

  if (metrics.tasksOverdue > 0) {
    recommendations.push({
      id: 'task-overdue',
      type: 'critical',
      title: 'Overdue tasks found',
      recommendation: 'Review overdue tasks and reassign owners to close them within 48 hours.',
      reason: `${metrics.tasksOverdue} overdue task${metrics.tasksOverdue === 1 ? '' : 's'} is delaying event progress.`,
      priority: 'high',
    })
  }

  if (metrics.tasksUnassigned > 0) {
    recommendations.push({
      id: 'task-unassigned',
      type: 'warning',
      title: 'Tasks need owners',
      recommendation: 'Assign open tasks to committee leads to keep planning momentum.',
      reason: `${metrics.tasksUnassigned} open task${metrics.tasksUnassigned === 1 ? '' : 's'} are still unassigned.`,
      priority: 'medium',
    })
  }

  if (metrics.timelineOverdue > 0) {
    recommendations.push({
      id: 'timeline-overdue',
      type: 'critical',
      title: 'Milestones are overdue',
      recommendation: 'Address overdue milestones immediately and adjust the timeline if needed.',
      reason: `${metrics.timelineOverdue} milestone${metrics.timelineOverdue === 1 ? '' : 's'} are overdue.`,
      priority: 'high',
    })
  } else if (metrics.upcomingMilestones > 0) {
    recommendations.push({
      id: 'timeline-upcoming',
      type: 'warning',
      title: 'Upcoming milestones',
      recommendation: 'Confirm upcoming milestones and make sure owners are aware of the timeline.',
      reason: `${metrics.upcomingMilestones} milestone${metrics.upcomingMilestones === 1 ? '' : 's'} are due soon.`, 
      priority: 'medium',
    })
  }

  if (metrics.fundingTarget > 0 && metrics.fundingProgress < 50) {
    recommendations.push({
      id: 'funding-gap',
      type: 'critical',
      title: 'Funding gap detected',
      recommendation: 'Share the contribution page and promote sponsorship categories to close the gap.',
      reason: `Funding progress is only ${metrics.fundingProgress}%, well below the goal.`, 
      priority: 'high',
    })
  } else if (metrics.fundingTarget > 0 && metrics.fundingProgress < 80) {
    recommendations.push({
      id: 'funding-watch',
      type: 'warning',
      title: 'Funding progress is slow',
      recommendation: 'Add at least one new contribution category or remind supporters to pledge.',
      reason: `Funding progress is ${metrics.fundingProgress}%.`, 
      priority: 'medium',
    })
  }

  if (metrics.vendorNeeds > 0 && metrics.vendorInquiryCount === 0) {
    recommendations.push({
      id: 'vendor-inquiries',
      type: 'warning',
      title: 'No vendor inquiries yet',
      recommendation: 'Request quotes from a few vendors so you can compare options and reduce vendor risk.',
      reason: 'Critical vendor needs are present but no quote requests have been sent yet.',
      priority: 'medium',
    })
  }

  if (metrics.guestCount === 0) {
    recommendations.push({
      id: 'guest-invitations',
      type: 'warning',
      title: 'No RSVP invites created',
      recommendation: 'Create guest invitations or share RSVP links to start collecting responses.',
      reason: 'There are currently no invite records for this event.',
      priority: 'medium',
    })
  } else if (metrics.rsvpAccepted === 0) {
    recommendations.push({
      id: 'rsvp-low',
      type: 'suggestion',
      title: 'RSVP response is low',
      recommendation: 'Send a reminder or share the RSVP page so guests can respond.',
      reason: 'No accepted RSVPs have been recorded yet.',
      priority: 'medium',
    })
  }

  const committeeUnassigned = metrics.committeeRoles - metrics.committeeAssignedRoles
  if (committeeUnassigned > 0) {
    recommendations.push({
      id: 'committee-unassigned',
      type: 'warning',
      title: 'Committee roles need assignment',
      recommendation: 'Assign key committee roles to reduce coordination risk.',
      reason: `${committeeUnassigned} committee role${committeeUnassigned === 1 ? '' : 's'} remain unassigned.`, 
      priority: 'medium',
    })
  }

  if (metrics.budgetOverruns > 0) {
    recommendations.push({
      id: 'budget-overrun',
      type: 'warning',
      title: 'Budget overrun risk',
      recommendation: 'Review budget categories where actuals are above estimates and adjust spend plans.',
      reason: `${metrics.budgetOverruns} budget category${metrics.budgetOverruns === 1 ? '' : 'ies'} are overspending.`, 
      priority: 'high',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'stable-operations',
      type: 'info',
      title: 'Planning operations are stable',
      recommendation: 'Continue with your current plan and check the dashboard regularly.',
      reason: 'No major risks were detected in the current event data.',
      priority: 'low',
    })
  }

  return recommendations
}
