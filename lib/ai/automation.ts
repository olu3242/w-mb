import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import { queueNotification } from '@/lib/notifications/engine'
import { logActivity } from '@/lib/ops/activity'
import type { OccasionIntelligenceContext } from './context'

export type AutomationRuleType = 'info' | 'reminder' | 'escalation' | 'alert' | 'summary' | 'warning'

export type AutomationTriggerType =
  | 'task_overdue'
  | 'rsvp_deadline_approaching'
  | 'vendor_inactive'
  | 'contribution_target_reached'
  | 'low_rsvp_turnout'
  | 'budget_overrun'
  | 'missing_vendor_category'
  | 'event_date_approaching'

export type AutomationRule = {
  id: string
  trigger: AutomationTriggerType
  type: AutomationRuleType
  title: string
  description: string
  suggestedAction: string
  condition: (context: OccasionIntelligenceContext) => boolean
}

export type AutomationEventInput = {
  occasionId: string
  ruleId: string
  title: string
  body: string
  metadata?: Json
}

export type AutomationQueueItem = {
  id: string
  automation_rule_id: string
  occasion_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  payload: Json
  scheduled_at: string
  created_at: string
}

const rules: AutomationRule[] = [
  {
    id: 'task-overdue-reminder',
    trigger: 'task_overdue',
    type: 'alert',
    title: 'Task overdue alert',
    description: 'A task has passed its due date without completion.',
    suggestedAction: 'Review overdue tasks and assign owners to close them.',
    condition: context => context.metrics.tasksOverdue > 0,
  },
  {
    id: 'rsvp-deadline-reminder',
    trigger: 'rsvp_deadline_approaching',
    type: 'reminder',
    title: 'RSVP deadline approaching',
    description: 'A timeline milestone for guest RSVP is coming up soon.',
    suggestedAction: 'Send a reminder to guests and review RSVP outreach.',
    condition: context => context.metrics.upcomingMilestones > 0 && context.metrics.guestCount > 0,
  },
  {
    id: 'vendor-inactivity-warning',
    trigger: 'vendor_inactive',
    type: 'warning',
    title: 'Vendor inquiry required',
    description: 'A required vendor category has no active quote requests.',
    suggestedAction: 'Request quotes for vendor categories that are still unfilled.',
    condition: context => context.metrics.vendorNeeds > 0 && context.metrics.vendorInquiryCount === 0,
  },
  {
    id: 'funding-target-summary',
    trigger: 'contribution_target_reached',
    type: 'summary',
    title: 'Funding progress summary',
    description: 'The event funding progress has changed significantly.',
    suggestedAction: 'Review the funding page and promote the remaining gaps.',
    condition: context => context.metrics.fundingTarget > 0 && context.metrics.fundingProgress < 80,
  },
  {
    id: 'low-rsvp-turnout-suggestion',
    trigger: 'low_rsvp_turnout',
    type: 'reminder',
    title: 'RSVP turnout is low',
    description: 'RSVP response is below the expected level for this event.',
    suggestedAction: 'Send reminders or update guest messaging to accelerate responses.',
    condition: context => context.metrics.guestCount > 0 && context.metrics.rsvpAccepted === 0,
  },
  {
    id: 'budget-overrun-alert',
    trigger: 'budget_overrun',
    type: 'alert',
    title: 'Budget overrun risk',
    description: 'A spending category is currently over its estimate.',
    suggestedAction: 'Review overrun categories and adjust spending or budgets.',
    condition: context => context.metrics.budgetOverruns > 0,
  },
  {
    id: 'missing-vendor-category-warning',
    trigger: 'missing_vendor_category',
    type: 'warning',
    title: 'Vendor category missing',
    description: 'A critical vendor need remains unaddressed.',
    suggestedAction: 'Add or source a vendor for the missing category.',
    condition: context => context.metrics.vendorNeeds > 0 && context.metrics.vendorInquiryCount === 0,
  },
  {
    id: 'event-date-approaching-reminder',
    trigger: 'event_date_approaching',
    type: 'reminder',
    title: 'Event date approaching',
    description: 'The event date is getting close and operations should be locked in.',
    suggestedAction: 'Review vendor confirmations, RSVPs, and timeline readiness.',
    condition: context => {
      if (!context.eventDate) return false
      const dueDate = new Date(context.eventDate)
      const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 14
    },
  },
]

export function getAutomationRules() {
  return rules
}

export function evaluateAutomationRules(context: OccasionIntelligenceContext) {
  return rules.filter(rule => rule.condition(context))
}

export async function queueAutomationEvent(
  supabase: SupabaseClient<Database, 'public'>,
  input: AutomationEventInput,
) {
  const eventRecord = await supabase.from('automation_events').insert({
    occasion_id: input.occasionId,
    rule_id: input.ruleId,
    title: input.title,
    body: input.body,
    metadata: input.metadata ?? {},
  }).select('id').single()

  if (!eventRecord.data) {
    throw new Error('Failed to queue automation event')
  }

  await supabase.from('automation_queue').insert({
    automation_event_id: eventRecord.data.id,
    occasion_id: input.occasionId,
    status: 'queued',
    payload: input.metadata ?? {},
    scheduled_at: new Date().toISOString(),
  })

  await logActivity(supabase, {
    occasionId: input.occasionId,
    activityType: 'automation.queued',
    title: `Automation queued: ${input.title}`,
    body: input.body,
    metadata: { ruleId: input.ruleId, payload: input.metadata ?? {} },
  })

  await queueNotification(supabase, {
    occasionId: input.occasionId,
    channel: 'in_app',
    notificationType: 'automation_triggered',
    title: input.title,
    body: input.body,
    metadata: input.metadata,
  })
}

export async function recordAutomationExecution(
  supabase: SupabaseClient<Database, 'public'>,
  automationQueueId: string,
  status: 'processing' | 'completed' | 'failed',
  metadata?: Json,
) {
  await supabase.from('automation_executions').insert({
    automation_queue_id: automationQueueId,
    status,
    metadata: metadata ?? {},
    started_at: new Date().toISOString(),
    completed_at: status === 'processing' ? null : new Date().toISOString(),
  })
}

export async function recordAutomationFailure(
  supabase: SupabaseClient<Database, 'public'>,
  automationExecutionId: string,
  error: string,
  metadata?: Json,
) {
  await supabase.from('automation_failures').insert({
    automation_execution_id: automationExecutionId,
    error_message: error,
    metadata: metadata ?? {},
  })
}
