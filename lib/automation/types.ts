import type { Json } from '@/types/database'

export type AutomationSourceType =
  | 'occasion'
  | 'task'
  | 'contribution'
  | 'vendor_inquiry'
  | 'rsvp'
  | 'budget'
  | 'payout'
  | 'organization_event'
  | 'system'

export type AutomationEventType =
  | 'occasion_created'
  | 'task_created'
  | 'task_assigned'
  | 'task_completed'
  | 'task_overdue'
  | 'contribution_paid'
  | 'funding_goal_reached'
  | 'vendor_inquiry_created'
  | 'vendor_inquiry_stale'
  | 'rsvp_received'
  | 'rsvp_deadline_approaching'
  | 'budget_overrun'
  | 'payout_requested'
  | 'event_date_approaching'
  | 'event_completed'
  | 'organization_event_due'

export type AutomationActionType =
  | 'create_notification'
  | 'create_ai_recommendation'
  | 'create_activity_feed_item'
  | 'send_email_if_configured'
  | 'generate_whatsapp_message'
  | 'create_admin_review'
  | 'escalate_to_organizer'
  | 'remind_committee_member'
  | 'update_event_health_score'
  | 'create_follow_up_task'

export type AutomationRuleRecord = {
  id: string
  organization_id?: string | null
  occasion_id?: string | null
  rule_type: string
  trigger_type: AutomationEventType | string
  action_type: AutomationActionType | string
  title?: string | null
  description?: string | null
  suggested_action?: string | null
  conditions?: Json
  action_payload?: Json
  is_active?: boolean
  active?: boolean
}

export type AutomationEventInput = {
  organizationId?: string | null
  occasionId?: string | null
  sourceType: AutomationSourceType
  sourceId?: string | null
  eventType: AutomationEventType
  payload?: Json
}

export type AutomationQueueRecord = {
  id: string
  automation_event_id?: string | null
  automation_rule_id?: string | null
  organization_id?: string | null
  occasion_id?: string | null
  action_type: AutomationActionType | string
  payload?: Json
  status: string
  attempts: number
  max_attempts: number
  run_after?: string | null
  locked_at?: string | null
  processed_at?: string | null
  error_message?: string | null
}

export type AutomationProcessResult = {
  processed: number
  failed: number
  skipped: number
  queued?: number
}
