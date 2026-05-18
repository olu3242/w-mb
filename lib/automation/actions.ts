import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import { buildEventIntelligenceContext } from '@/lib/ai/orchestration'
import { summarizeEventHealth } from '@/lib/ai/chat/assistant'
import { buildWhatsappReminder, buildWhatsappRsvpReminder, buildWhatsappShareUrl, buildWhatsappVendorCheckin } from '@/lib/ai/tools/whatsapp'
import { getResendClient } from '@/lib/resend/client'
import { getPublicSiteUrl } from '@/lib/env'
import { logActivity } from '@/lib/ops/activity'
import { queueNotification } from '@/lib/notifications/engine'
import { logAutomation } from './audit'
import type { AutomationQueueRecord } from './types'

type QueuePayload = {
  event?: {
    eventType?: string
    sourceType?: string
    sourceId?: string | null
    payload?: Record<string, unknown>
  }
  rule?: {
    id?: string
    title?: string
    description?: string
    suggestedAction?: string
    actionPayload?: Record<string, unknown>
  }
}

function asPayload(value: Json | undefined): QueuePayload {
  return (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as QueuePayload
}

async function getEventContext(supabase: SupabaseClient<Database, 'public'>, occasionId: string) {
  const [
    { data: event },
    { data: tasks },
    { data: timelineItems },
    { data: budgetCategories },
    { data: sponsorshipCategories },
    { data: contributions },
    { data: vendorNeeds },
    { data: vendorInquiries },
    { data: guests },
    { data: committeeRoles },
  ] = await Promise.all([
    supabase.from('events').select('*').eq('id', occasionId).single(),
    supabase.from('event_tasks').select('id, status, due_at, assigned_to, priority').eq('occasion_id', occasionId),
    supabase.from('event_timeline_items').select('id, status, due_at, milestone_type').eq('occasion_id', occasionId),
    supabase.from('budget_categories').select('id, estimated_amount, actual_amount').eq('occasion_id', occasionId),
    supabase.from('sponsorship_categories').select('id, name, target_amount, funded_amount, status').eq('occasion_id', occasionId),
    supabase.from('contributions').select('id, amount, status, currency').eq('occasion_id', occasionId),
    supabase.from('event_vendor_needs').select('id, category, status').eq('occasion_id', occasionId),
    supabase.from('vendor_inquiries').select('id, status').eq('occasion_id', occasionId),
    supabase.from('event_guests').select('id, status, guest_count').eq('occasion_id', occasionId),
    supabase.from('committee_roles').select('id, assigned_to, role').eq('occasion_id', occasionId),
  ])

  return buildEventIntelligenceContext({
    occasionId,
    occasionType: event?.occasion_type ?? 'custom',
    title: event?.title,
    eventDate: event?.event_date,
    location: event?.location,
    timezone: event?.timezone,
    locale: event?.locale,
    country: event?.country,
    eventCurrency: event?.currency,
    diasporaHub: event?.diaspora_hub,
    isPublic: event?.is_public,
    signals: event?.signals ?? {},
    tasks: tasks ?? [],
    timelineItems: timelineItems ?? [],
    budgetCategories: budgetCategories ?? [],
    sponsorshipCategories: sponsorshipCategories ?? [],
    contributions: contributions ?? [],
    vendorNeeds: vendorNeeds ?? [],
    vendorInquiries: vendorInquiries ?? [],
    guests: guests ?? [],
    committeeRoles: committeeRoles ?? [],
  })
}

async function getEventOwner(supabase: SupabaseClient<Database, 'public'>, occasionId: string | null | undefined) {
  if (!occasionId) return null
  const { data } = await supabase.from('events').select('owner_id, slug, title').eq('id', occasionId).maybeSingle()
  return data ?? null
}

export async function executeAutomationAction(
  supabase: SupabaseClient<Database, 'public'>,
  item: AutomationQueueRecord,
) {
  const payload = asPayload(item.payload)
  const title = payload.rule?.title ?? 'Owambe automation'
  const body = payload.rule?.suggestedAction ?? payload.rule?.description ?? 'Review this event automation.'
  const eventOwner = await getEventOwner(supabase, item.occasion_id)
  const publicUrl = eventOwner?.slug ? `${getPublicSiteUrl()}/e/${eventOwner.slug}` : getPublicSiteUrl()

  switch (item.action_type) {
    case 'create_notification':
    case 'escalate_to_organizer':
    case 'remind_committee_member': {
      await supabase.from('notification_events').insert({
        organization_id: item.organization_id ?? null,
        occasion_id: item.occasion_id ?? null,
        user_id: eventOwner?.owner_id ?? null,
        channel: 'in_app',
        title,
        body,
        payload: payload as Json,
        status: 'pending',
      })
      if (item.occasion_id) {
        await queueNotification(supabase, {
          occasionId: item.occasion_id,
          recipientUserId: eventOwner?.owner_id ?? null,
          channel: 'in_app',
          notificationType: 'automation',
          title,
          body,
          metadata: payload as Json,
        })
      }
      break
    }
    case 'create_ai_recommendation': {
      await supabase.from('ai_recommendations').insert({
        occasion_id: item.occasion_id,
        recommendation_type: payload.rule?.actionPayload?.recommendation_type ?? 'automation',
        title,
        reason: payload.rule?.description ?? 'Automation detected an operational risk.',
        recommendation: body,
        metadata: payload as Json,
      })
      break
    }
    case 'create_activity_feed_item': {
      if (!item.occasion_id) break
      await logActivity(supabase, {
        occasionId: item.occasion_id,
        activityType: String(payload.rule?.actionPayload?.activity_type ?? 'automation.activity'),
        title,
        body,
        metadata: payload as Json,
      })
      break
    }
    case 'generate_whatsapp_message': {
      if (!item.occasion_id) break
      const context = await getEventContext(supabase, item.occasion_id)
      const template = payload.rule?.actionPayload?.template
      const message = template === 'rsvp'
        ? await buildWhatsappRsvpReminder(context)
        : template === 'vendor_checkin'
          ? await buildWhatsappVendorCheckin(context)
          : await buildWhatsappReminder(context)
      await supabase.from('whatsapp_messages').insert({
        occasion_id: item.occasion_id,
        message,
        status: 'draft',
        channel: 'whatsapp_ready',
        metadata: { ...payload, shareUrl: buildWhatsappShareUrl(message, publicUrl) } as Json,
      })
      break
    }
    case 'create_admin_review': {
      await supabase.from('admin_reviews').insert({
        subject_type: payload.event?.sourceType ?? 'automation',
        subject_id: payload.event?.sourceId ?? null,
        review_type: payload.rule?.actionPayload?.review_type ?? 'automation_review',
        status: 'open',
        priority: 'high',
        notes: `${title}: ${body}`,
      })
      break
    }
    case 'send_email_if_configured': {
      const resend = getResendClient()
      if (!resend) {
        await logAutomation(supabase, {
          queueId: item.id,
          organizationId: item.organization_id,
          occasionId: item.occasion_id,
          actionType: item.action_type,
          status: 'skipped',
          message: 'Email provider not configured; skipped send.',
        })
        break
      }
      await supabase.from('notification_events').insert({
        organization_id: item.organization_id ?? null,
        occasion_id: item.occasion_id ?? null,
        user_id: eventOwner?.owner_id ?? null,
        channel: 'email',
        title,
        body,
        payload: payload as Json,
        status: 'pending',
      })
      break
    }
    case 'update_event_health_score': {
      if (!item.occasion_id) break
      const context = await getEventContext(supabase, item.occasion_id)
      const summary = await summarizeEventHealth(context)
      await supabase.from('event_health_snapshots').insert({
        occasion_id: item.occasion_id,
        overall_score: context.healthScore?.overall ?? 0,
        metrics: context.metrics as Json,
        health_summary: summary.text,
      })
      break
    }
    case 'create_follow_up_task': {
      if (!item.occasion_id) break
      await supabase.from('event_tasks').insert({
        occasion_id: item.occasion_id,
        title,
        description: body,
        status: 'todo',
        priority: payload.rule?.actionPayload?.priority ?? 'medium',
        created_by: eventOwner?.owner_id ?? null,
      })
      break
    }
    default:
      throw new Error(`Unsupported automation action: ${item.action_type}`)
  }
}
