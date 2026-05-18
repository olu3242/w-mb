import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { enqueueAutomationEvent } from './enqueue'

function daysUntil(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return null
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000)
}

function hoursSince(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return null
  return Math.floor((Date.now() - date.getTime()) / 3_600_000)
}

export async function scanTimeBasedAutomationEvents(supabase: SupabaseClient<Database, 'public'>) {
  let queued = 0
  const now = new Date().toISOString()

  const [{ data: tasks }, { data: events }, { data: inquiries }, { data: budgets }, { data: payouts }, { data: orgEvents }] = await Promise.all([
    supabase.from('event_tasks').select('id, occasion_id, title, due_at, status').lt('due_at', now).neq('status', 'done').limit(50),
    supabase.from('events').select('id, event_date, title').not('event_date', 'is', null).limit(100),
    supabase.from('vendor_inquiries').select('id, occasion_id, status, created_at').neq('status', 'closed').limit(50),
    supabase.from('budget_categories').select('id, occasion_id, name, estimated_amount, actual_amount').limit(100),
    supabase.from('payout_requests').select('id, occasion_id, trust_status, status, requested_at').in('status', ['pending_review', 'pending']).limit(50),
    supabase.from('organization_events').select('organization_id, occasion_id, recurrence_rule, events(id, event_date, title)').limit(100),
  ])

  for (const task of tasks ?? []) {
    const result = await enqueueAutomationEvent(supabase, {
      occasionId: task.occasion_id,
      sourceType: 'task',
      sourceId: task.id,
      eventType: 'task_overdue',
      payload: { title: task.title, dueAt: task.due_at },
    })
    queued += result.queued
  }

  for (const event of events ?? []) {
    const days = daysUntil(event.event_date)
    if (days === null) continue
    if (days >= 0 && days <= 14) {
      const result = await enqueueAutomationEvent(supabase, {
        occasionId: event.id,
        sourceType: 'occasion',
        sourceId: event.id,
        eventType: 'event_date_approaching',
        payload: { title: event.title, daysToEvent: days },
      })
      queued += result.queued
    }
    if (days < 0 && days >= -2) {
      const result = await enqueueAutomationEvent(supabase, {
        occasionId: event.id,
        sourceType: 'occasion',
        sourceId: event.id,
        eventType: 'event_completed',
        payload: { title: event.title, daysSinceEvent: Math.abs(days) },
      })
      queued += result.queued
    }
  }

  for (const inquiry of inquiries ?? []) {
    if ((hoursSince(inquiry.created_at) ?? 0) < 48) continue
    const result = await enqueueAutomationEvent(supabase, {
      occasionId: inquiry.occasion_id,
      sourceType: 'vendor_inquiry',
      sourceId: inquiry.id,
      eventType: 'vendor_inquiry_stale',
      payload: { status: inquiry.status, createdAt: inquiry.created_at },
    })
    queued += result.queued
  }

  for (const budget of budgets ?? []) {
    if (Number(budget.actual_amount ?? 0) <= Number(budget.estimated_amount ?? 0)) continue
    const result = await enqueueAutomationEvent(supabase, {
      occasionId: budget.occasion_id,
      sourceType: 'budget',
      sourceId: budget.id,
      eventType: 'budget_overrun',
      payload: { name: budget.name, estimated: budget.estimated_amount, actual: budget.actual_amount },
    })
    queued += result.queued
  }

  for (const payout of payouts ?? []) {
    const result = await enqueueAutomationEvent(supabase, {
      occasionId: payout.occasion_id,
      sourceType: 'payout',
      sourceId: payout.id,
      eventType: 'payout_requested',
      payload: { trustStatus: payout.trust_status, status: payout.status, requestedAt: payout.requested_at },
    })
    queued += result.queued
  }

  for (const link of orgEvents ?? []) {
    const linkedEvent = Array.isArray(link.events) ? link.events[0] : link.events
    const days = daysUntil(linkedEvent?.event_date)
    if (days === null || days < 0 || days > 14) continue
    const result = await enqueueAutomationEvent(supabase, {
      organizationId: link.organization_id,
      occasionId: link.occasion_id,
      sourceType: 'organization_event',
      sourceId: link.occasion_id,
      eventType: 'organization_event_due',
      payload: { title: linkedEvent?.title, daysToEvent: days, recurrenceRule: link.recurrence_rule },
    })
    queued += result.queued
  }

  return { queued }
}
