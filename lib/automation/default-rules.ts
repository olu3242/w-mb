import type { AutomationActionType, AutomationEventType } from './types'

export type DefaultAutomationRule = {
  id: string
  ruleType: string
  triggerType: AutomationEventType
  actionType: AutomationActionType
  title: string
  description: string
  suggestedAction: string
}

export const DEFAULT_AUTOMATION_RULES: DefaultAutomationRule[] = [
  {
    id: 'default-task-overdue-escalation',
    ruleType: 'escalation',
    triggerType: 'task_overdue',
    actionType: 'escalate_to_organizer',
    title: 'Task overdue escalation',
    description: 'Escalates overdue tasks to the event organizer and assignee.',
    suggestedAction: 'Review overdue tasks and assign a clear owner today.',
  },
  {
    id: 'default-rsvp-deadline-reminder',
    ruleType: 'reminder',
    triggerType: 'rsvp_deadline_approaching',
    actionType: 'generate_whatsapp_message',
    title: 'RSVP deadline reminder',
    description: 'Creates an RSVP reminder when response rate is low near the event date.',
    suggestedAction: 'Send an RSVP reminder to invited guests.',
  },
  {
    id: 'default-vendor-inquiry-stale',
    ruleType: 'reminder',
    triggerType: 'vendor_inquiry_stale',
    actionType: 'create_follow_up_task',
    title: 'Vendor inquiry follow-up',
    description: 'Creates a follow-up task when a vendor inquiry is stale.',
    suggestedAction: 'Follow up with vendors who have not responded.',
  },
  {
    id: 'default-funding-gap-alert',
    ruleType: 'alert',
    triggerType: 'event_date_approaching',
    actionType: 'create_ai_recommendation',
    title: 'Funding gap alert',
    description: 'Recommends contribution outreach when funding is low near the event.',
    suggestedAction: 'Share a contribution reminder and highlight open sponsorship categories.',
  },
  {
    id: 'default-budget-overrun-warning',
    ruleType: 'warning',
    triggerType: 'budget_overrun',
    actionType: 'create_ai_recommendation',
    title: 'Budget overrun warning',
    description: 'Creates an AI warning when actual spend exceeds estimated budget.',
    suggestedAction: 'Review budget overruns and update spend plans.',
  },
  {
    id: 'default-event-day-ops-reminder',
    ruleType: 'reminder',
    triggerType: 'event_date_approaching',
    actionType: 'create_activity_feed_item',
    title: 'Event-day operations checklist',
    description: 'Posts an operations reminder when the event is tomorrow.',
    suggestedAction: 'Confirm vendors, RSVPs, check-ins, and emergency contacts.',
  },
  {
    id: 'default-post-event-memory-prompt',
    ruleType: 'reminder',
    triggerType: 'event_completed',
    actionType: 'generate_whatsapp_message',
    title: 'Post-event memory prompt',
    description: 'Prompts guests to add memories after an event ends.',
    suggestedAction: 'Share a memory wall prompt with guests.',
  },
  {
    id: 'default-thank-you-reminder',
    ruleType: 'reminder',
    triggerType: 'contribution_paid',
    actionType: 'create_follow_up_task',
    title: 'Thank-you reminder',
    description: 'Reminds organizers to thank paid contributors.',
    suggestedAction: 'Send thank-you messages to contributors.',
  },
  {
    id: 'default-organization-recurring-event',
    ruleType: 'reminder',
    triggerType: 'organization_event_due',
    actionType: 'create_notification',
    title: 'Recurring organization event reminder',
    description: 'Reminds organization admins to prepare recurring events.',
    suggestedAction: 'Prepare the next recurring event workspace.',
  },
  {
    id: 'default-suspicious-payout-review',
    ruleType: 'alert',
    triggerType: 'payout_requested',
    actionType: 'create_admin_review',
    title: 'Suspicious payout review',
    description: 'Creates an admin review when payout timing or funding patterns look risky.',
    suggestedAction: 'Review payout request before approval.',
  },
]
