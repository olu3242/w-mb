import type { OccasionIntelligenceContext } from '../context'

export function planningQuestionPrompt(question: string, context: OccasionIntelligenceContext) {
  return `You are Owambe AI Assistant, an event operations architect for social occasions.
Use the event context to answer the question clearly and practically.

Event title: ${context.title ?? 'Unknown'}
Event date: ${context.eventDate ?? 'Unknown'}
Location: ${context.location ?? 'Unknown'}
Timezone: ${context.timezone ?? 'UTC'}
Currency: ${context.eventCurrency ?? 'USD'}
Funding progress: ${context.metrics.fundingProgress}%
Guest RSVPs accepted: ${context.metrics.rsvpAccepted}
Tasks overdue: ${context.metrics.tasksOverdue}
Budget overruns: ${context.metrics.budgetOverruns}

Question: ${question}

Answer with a concise recommendation and, if helpful, a short next step list.`
}

export function eventHealthPrompt(context: OccasionIntelligenceContext) {
  return `Summarize the event health for ${context.title ?? 'this event'}.
Include live execution readiness, top risks, and highest-impact actions.
Use the event currency ${context.eventCurrency ?? 'USD'} and local timezone ${context.timezone ?? 'UTC'}.

Metrics:
- Tasks overdue: ${context.metrics.tasksOverdue}
- Open tasks: ${context.metrics.tasksOpen}
- Upcoming milestones: ${context.metrics.upcomingMilestones}
- Funding progress: ${context.metrics.fundingProgress}%
- Budget overruns: ${context.metrics.budgetOverruns}
- RSVP accepted: ${context.metrics.rsvpAccepted}
- Committee coverage: ${context.metrics.committeeAssignedRoles}/${context.metrics.committeeRoles}

Provide a short operations summary and one recommended alert for the event team.`
}

export function scheduleGenerationPrompt(context: OccasionIntelligenceContext) {
  return `Create a high-level event schedule for ${context.title ?? 'the event'}.
Use a simple agenda structure with arrival, core program, and closing notes.
Assume the local timezone is ${context.timezone ?? 'UTC'} and the event currency is ${context.eventCurrency ?? 'USD'}.
Include a short note for vendor coordination and guest check-in.`
}

export function whatsappMessagePrompt(template: 'rsvp' | 'reminder' | 'vendor_checkin', context: OccasionIntelligenceContext) {
  if (template === 'rsvp') {
    return `Write a WhatsApp-ready RSVP reminder for guests of ${context.title ?? 'this event'}.
Keep it warm, clear, and include the event date in local time ${context.timezone ?? 'UTC'}.
Use the event currency ${context.eventCurrency ?? 'USD'} only if mentioning contributions.`
  }

  if (template === 'reminder') {
    return `Create a WhatsApp reminder for the event team to confirm vendors and guest arrivals for ${context.title ?? 'this event'}.
Keep the message short and include the next key milestone.`
  }

  return `Generate a WhatsApp-ready vendor check-in prompt for ${context.title ?? 'this event'}.
Include a friendly check-in request and a note about arrival window in ${context.timezone ?? 'UTC'}.`
}
