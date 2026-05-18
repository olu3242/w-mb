import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AliceUnlockCard } from '@/components/alice/alice-unlock-card'
import { getOccasionTheme } from '@/lib/occasion/theme-config'
import { getPlanningTemplate } from '@/lib/occasion/planning-templates'
import type { OccasionType } from '@/lib/occasion/occasion-types'
import { PayoutRequestForm } from '@/components/payments/payout-request-form'
import { saveAiMemorySnapshot } from '@/app/actions/ai-ops'
import {
  buildEventIntelligenceContext,
  calculateHealthScore,
  generateEventSummary,
  getInsightFeed,
  getRecommendations,
} from '@/lib/ai/orchestration'
import { evaluateAutomationRules } from '@/lib/ai/automation'
import { generateOperationsSummary } from '@/lib/ai/operations-summary'
import { buildEventAnalytics } from '@/lib/ai/analytics'
import { summarizeEventHealth, generateEventSchedule } from '@/lib/ai/chat/assistant'
import { loadRecentEventMemory } from '@/lib/ai/memory/engine'
import {
  buildWhatsappReminder,
  buildWhatsappRsvpReminder,
  buildWhatsappShareUrl,
  buildWhatsappVendorCheckin,
} from '@/lib/ai/tools/whatsapp'
import { InvitationPreview } from '@/components/invitations/invitation-preview'
import { buildWhatsappShareUrl as buildInvitationWhatsappShareUrl, generateInvitationCopy } from '@/lib/invitations/generator'
import { buildAnnouncementWhatsappUrl } from '@/lib/announcements/templates'
import { getGallerySectionPresets, getGalleryShareCopy, getGalleryWhatsappUrl } from '@/lib/gallery/templates'
import { formatCurrency, normalizeCurrency } from '@/lib/currency'
import type { Event } from '@/types'

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/gifts', label: 'Gifts', signal: 'has_contributions' },
  { href: '/tasks', label: 'Tasks', signal: 'has_tasks' },
  { href: '/budget', label: 'Budget', signal: 'has_budget_profile' },
  { href: '/vendors', label: 'Vendors', signal: 'has_vendors' },
  { href: '/venue', label: 'Venue', signal: 'has_venue' },
  { href: '/timeline', label: 'Timeline', signal: 'has_timeline' },
  { href: '/committee', label: 'Committee' },
  { href: '/guests', label: 'Guests' },
  { href: '/invitations', label: 'Invitation' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/updates', label: 'Updates' },
  { href: '/escrow', label: 'Escrow' },
  { href: '/alice', label: '🧠 ALICE', aliceOnly: true },
]

export default async function EventHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!event) notFound()

  const ev = event as unknown as Event
  const signals = ev.signals ?? {}
  const base = `/events/${slug}`
  const occasionType = (ev.occasion_type ?? 'custom') as OccasionType
  const theme = getOccasionTheme(occasionType)
  const fallbackTemplate = getPlanningTemplate(occasionType)

  const [
    { data: checklist },
    { data: budgetCategories },
    { data: sponsorshipCategories },
    { data: vendorNeeds },
    { data: committeeRoles },
    { data: workspaceSettings },
    { data: contributions },
    { data: vendorInquiries },
    { data: memoryPosts },
    { data: timelineItems },
    { data: payoutAccount },
    { data: payoutRequests },
    { data: guests },
    { data: announcements },
    { data: eventAnnouncements },
    { data: activeInvitation },
    { data: gallerySections },
    { data: galleryMedia },
    { data: activityFeed },
    { data: checkins },
    { data: emergencyAlerts },
    { data: operationUpdates },
    { data: whatsappMessages },
    { data: automationQueue },
    { data: automationLogs },
    { data: automationRules },
    { data: aiRecommendations },
  ] = await Promise.all([
    supabase.from('event_tasks').select('*').eq('occasion_id', ev.id).order('created_at').limit(7),
    supabase.from('budget_categories').select('*').eq('occasion_id', ev.id).order('sort_order'),
    supabase.from('sponsorship_categories').select('*').eq('occasion_id', ev.id).order('created_at'),
    supabase.from('event_vendor_needs').select('*').eq('occasion_id', ev.id).order('sort_order'),
    supabase.from('committee_roles').select('*').eq('occasion_id', ev.id).order('sort_order'),
    supabase.from('event_workspace_settings').select('*').eq('occasion_id', ev.id).maybeSingle(),
    supabase
      .from('contributions')
      .select('id, contributor_name, amount, message, is_anonymous, status, created_at')
      .eq('occasion_id', ev.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('vendor_inquiries')
      .select('id, status, message, created_at, vendor_directory(name, category)')
      .eq('occasion_id', ev.id)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('memory_posts')
      .select('id, author_name, message, created_at')
      .eq('occasion_id', ev.id)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('event_timeline_items')
      .select('id, status, due_at, milestone_type')
      .eq('occasion_id', ev.id)
      .order('due_at', { ascending: true }),
    supabase.from('payout_accounts').select('*').eq('owner_id', ev.owner_id).eq('provider', 'stripe').maybeSingle(),
    supabase.from('payout_requests').select('*').eq('occasion_id', ev.id).order('requested_at', { ascending: false }).limit(3),
    supabase.from('event_guests').select('id, status, guest_count').eq('occasion_id', ev.id),
    supabase.from('announcements').select('id, title, body, audience, channel, created_at').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(3),
    supabase.from('event_announcements').select('*').eq('occasion_id', ev.id).order('pinned', { ascending: false }).order('publish_at', { ascending: false }).limit(5),
    supabase.from('event_invitations').select('*').eq('occasion_id', ev.id).eq('is_active', true).order('created_at', { ascending: false }).maybeSingle(),
    supabase.from('event_gallery_sections').select('*').eq('occasion_id', ev.id).eq('is_active', true).order('sort_order', { ascending: true }).limit(6),
    supabase.from('event_gallery_media').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('activity_feed').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('event_checkins').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(6),
    supabase.from('event_emergency_alerts').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(4),
    supabase.from('event_operation_updates').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('whatsapp_messages').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(4),
    supabase.from('automation_queue').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('automation_logs').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('automation_rules').select('*').or(`occasion_id.eq.${ev.id},occasion_id.is.null`).eq('is_active', true).limit(8),
    supabase.from('ai_recommendations').select('*').eq('occasion_id', ev.id).order('created_at', { ascending: false }).limit(5),
  ])

  const totalTasks = checklist?.length ?? 0
  const completedTasks = checklist?.filter(task => task.status === 'done').length ?? 0
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const nextActions = Array.isArray(workspaceSettings?.next_actions)
    ? (workspaceSettings.next_actions as unknown[]).filter((item): item is string => typeof item === 'string')
    : fallbackTemplate.nextActions
  const fundedTotal = sponsorshipCategories?.reduce((sum, category) => sum + Number(category.funded_amount ?? 0), 0) ?? 0
  const targetTotal = sponsorshipCategories?.reduce((sum, category) => sum + Number(category.target_amount ?? 0), 0) ?? 0
  const fundingProgress = targetTotal > 0 ? Math.min(100, Math.round((fundedTotal / targetTotal) * 100)) : 0
  const totalPaid = contributions?.filter(contribution => contribution.status === 'paid').reduce((sum, contribution) => sum + Number(contribution.amount), 0) ?? 0
  const totalPending = contributions?.filter(contribution => contribution.status === 'pending').reduce((sum, contribution) => sum + Number(contribution.amount), 0) ?? 0
  const totalPledged = contributions?.filter(contribution => contribution.status === 'pledged').reduce((sum, contribution) => sum + Number(contribution.amount), 0) ?? 0
  const requestedPayoutTotal = payoutRequests?.filter(request => ['pending_review', 'approved', 'paid'].includes(request.status)).reduce((sum, request) => sum + Number(request.amount), 0) ?? 0
  const availableForPayout = Math.max(0, totalPaid - requestedPayoutTotal)
  const rsvpAccepted = guests?.filter(guest => guest.status === 'accepted').reduce((sum, guest) => sum + guest.guest_count, 0) ?? 0
  const rsvpMaybe = guests?.filter(guest => guest.status === 'maybe').length ?? 0
  const rsvpDeclined = guests?.filter(guest => guest.status === 'declined').length ?? 0

  const context = buildEventIntelligenceContext({
    occasionId: ev.id,
    occasionType,
    title: ev.title,
    eventDate: ev.event_date,
    location: ev.location,
    timezone: ev.timezone,
    locale: ev.locale,
    country: ev.country,
    eventCurrency: ev.currency,
    diasporaHub: ev.diaspora_hub,
    isPublic: ev.is_public,
    signals,
    tasks: checklist ?? [],
    timelineItems: timelineItems ?? [],
    budgetCategories: budgetCategories ?? [],
    sponsorshipCategories: sponsorshipCategories ?? [],
    contributions: contributions ?? [],
    vendorNeeds: vendorNeeds ?? [],
    vendorInquiries: vendorInquiries ?? [],
    guests: guests ?? [],
    committeeRoles: committeeRoles ?? [],
    announcementsCount: announcements?.length ?? 0,
    activityEventsCount: activityFeed?.length ?? 0,
  })

  const health = calculateHealthScore(context)
  const insights = getInsightFeed(context)
  const recommendations = getRecommendations(context)
  const summary = generateEventSummary(context)
  const automationTriggers = evaluateAutomationRules(context)
  const operationsSummary = generateOperationsSummary(context)
  const analytics = buildEventAnalytics(context)
  const [aiHealthSummary, aiSchedule, rsvpMessage, contributionMessage, vendorCheckinMessage, aiMemory] = await Promise.all([
    summarizeEventHealth(context),
    generateEventSchedule(context),
    buildWhatsappRsvpReminder(context),
    buildWhatsappReminder(context),
    buildWhatsappVendorCheckin(context),
    loadRecentEventMemory(supabase, ev.id),
  ])
  const publicEventUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/e/${slug}`
  const publicPath = `/e/${slug}`
  const shareTarget = publicEventUrl || publicPath
  const invitationWhatsappCopy = generateInvitationCopy({
    occasionType,
    eventName: activeInvitation?.title ?? ev.title,
    dateTime: ev.event_date,
    location: activeInvitation?.venue_address ?? ev.location,
    hostNames: activeInvitation?.host_names,
    rsvpLink: shareTarget,
    contributionLink: `${shareTarget}#pledge`,
    templateId: activeInvitation?.template_id,
  }).whatsappCopy
  const galleryPresets = getGallerySectionPresets(occasionType)
  const galleryShareCopy = getGalleryShareCopy({ eventName: ev.title, link: `${shareTarget}#gallery`, occasionType })
  const approvedGalleryMedia = galleryMedia?.filter(item => item.moderation_status === 'approved').length ?? 0
  const pendingGalleryMedia = galleryMedia?.filter(item => item.moderation_status === 'pending').length ?? 0
  const checkedInCount = checkins?.filter(item => item.checked_in).length ?? 0
  const openAlerts = emergencyAlerts?.filter(alert => !alert.resolved).length ?? 0
  const eventCurrency = normalizeCurrency(ev.currency ?? 'USD')
  const eventLocale = ev.locale ?? 'en-US'
  const pendingAutomation = automationQueue?.filter(item => ['pending', 'queued', 'processing'].includes(item.status)).length ?? 0
  const failedAutomation = automationQueue?.filter(item => item.status === 'failed').length ?? 0
  const processedAutomation = automationQueue?.filter(item => item.status === 'processed').length ?? 0

  const visibleTabs = TABS.filter(t => {
    if (t.aliceOnly) return ev.alice_unlocked
    if (t.signal) return !!signals[t.signal as keyof typeof signals]
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      <div className={`rounded-2xl border ${theme.cardBorder} ${theme.bgClass} p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${theme.primaryColor}`}>
              {theme.label}
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold">{ev.title}</h1>
            <p className="mt-3 max-w-2xl text-sm text-foreground/70">
              Owambe AI prepared your starter plan for a {workspaceSettings?.tone ?? theme.emotionalTone.toLowerCase()} workflow.
            </p>
            {ev.event_date && (
              <p className="mt-3 text-sm text-foreground/50">
                {new Date(ev.event_date).toLocaleDateString(eventLocale, { dateStyle: 'full', timeZone: ev.timezone ?? 'UTC' })}
              </p>
            )}
            {ev.location && <p className="text-sm text-foreground/40">{ev.location}</p>}
          </div>
          <div className="min-w-44 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Progress</p>
            <p className="mt-2 text-3xl font-bold">{progress}%</p>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className={`h-full rounded-full ${theme.accentColor}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-foreground/50">{completedTasks} of {totalTasks} starter tasks complete</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <p className="text-sm font-semibold text-foreground/60">Quick actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`${base}/tasks`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-foreground/70 hover:border-white/20">Open tasks</Link>
            <Link href={`${base}/guests`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-foreground/70 hover:border-white/20">Share invites</Link>
            <Link href={`${base}/invitations`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-foreground/70 hover:border-white/20">Invitation Studio</Link>
            <Link href={`${base}/updates`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-foreground/70 hover:border-white/20">Post update</Link>
            {ev.is_public && <Link href={`/e/${slug}`} className="rounded-full border border-ocean/30 px-3 py-1.5 text-xs text-ocean hover:bg-ocean/10">Share public page</Link>}
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{ev.is_public ? 'Public sharing' : 'Private event'}</p>
          <p className="mt-2 text-sm text-foreground/60">
            {ev.is_public ? 'This event page is public. Share it with contributors, vendors, or guests.' : 'Make the event public to share a contribution page and guest-facing details.'}
          </p>
        </div>
      </div>

      {recommendations.some(rec => rec.type === 'critical') && (
        <section className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
          <p className="font-semibold">Critical operations alert</p>
          <p className="mt-1 text-foreground/90">Your event has critical risks that should be addressed before the next planning milestone.</p>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-xl border border-white/5 bg-white/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Event health</p>
              <h2 className="mt-2 text-2xl font-display font-bold">{health.overall}% healthy</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Score</p>
              <p className="mt-1 text-3xl font-bold text-pulse">{health.overall}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-foreground/60">{summary}</p>
          <div className="mt-4 rounded-xl border border-pulse/15 bg-pulse/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-pulse">Owambe AI health summary</p>
            <p className="mt-2 text-sm leading-6 text-foreground/75">{aiHealthSummary.text}</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <p className="text-xs text-foreground/40">Tasks</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{health.scores.tasks}%</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <p className="text-xs text-foreground/40">Funding</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{health.scores.funding}%</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <p className="text-xs text-foreground/40">Timeline</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{health.scores.timeline}%</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-foreground/60">
            {health.topRisks.slice(0, 3).map(risk => (
              <p key={risk}>• {risk}</p>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <section className="rounded-xl border border-white/5 bg-white/5 p-4">
            <h3 className="font-display text-lg font-bold">AI insights</h3>
            <div className="mt-4 grid gap-3">
              {insights.map((item, index) => (
                <div key={index} className="rounded-lg border border-white/5 bg-black/10 p-3 text-sm text-foreground/80">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold">Recommended actions</h3>
              <span className="text-xs uppercase tracking-[0.2em] text-foreground/40">AI feed</span>
            </div>
            <div className="mt-4 grid gap-3">
              {recommendations.slice(0, 4).map(item => (
                <div key={item.id} className={`rounded-lg border border-white/5 p-3 ${item.type === 'critical' ? 'bg-red-500/10' : item.type === 'warning' ? 'bg-amber-500/10' : 'bg-white/[0.03]'}`}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-foreground/50">{item.reason}</p>
                  <p className="mt-2 text-sm text-foreground">{item.recommendation}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-white/5 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">AI assistant</p>
                <h3 className="mt-2 text-lg font-display font-bold">Operations orchestration</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-foreground/50">
                {operationsSummary.status === 'critical' ? 'Critical' : operationsSummary.status === 'attention_needed' ? 'Attention' : 'On track'}
              </span>
            </div>
            <p className="mt-3 text-sm text-foreground/60">{operationsSummary.headline}</p>
            <div className="mt-4 grid gap-2 text-sm text-foreground/70">
              {operationsSummary.bullets.map(bullet => (
                <p key={bullet}>• {bullet}</p>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/5 bg-black/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Active automation triggers</p>
              {automationTriggers.length ? (
                <div className="mt-3 grid gap-3">
                  {automationTriggers.map(trigger => (
                    <div key={trigger.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                      <p className="text-sm font-semibold">{trigger.title}</p>
                      <p className="mt-1 text-xs text-foreground/50">{trigger.description}</p>
                      <p className="mt-2 text-sm text-foreground">{trigger.suggestedAction}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-foreground/50">No automation triggers are active right now.</p>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Automation OS</p>
            <h3 className="mt-2 font-display text-lg font-bold">Proactive coordination health</h3>
            <p className="mt-2 text-sm text-foreground/60">Owambe is watching reminders, stale work, vendor follow-ups, funding gaps, and event-day readiness.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <span className="rounded-lg bg-white/5 px-3 py-2"><strong className="block text-lg text-foreground">{pendingAutomation}</strong>pending</span>
            <span className="rounded-lg bg-white/5 px-3 py-2"><strong className="block text-lg text-sage">{processedAutomation}</strong>processed</span>
            <span className="rounded-lg bg-red-500/10 px-3 py-2 text-red-100"><strong className="block text-lg">{failedAutomation}</strong>failed</span>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <OpsColumn title="Active automations">
            {(automationRules ?? []).map(rule => (
              <div key={rule.id} className="rounded-lg border border-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{rule.title ?? rule.id}</p>
                  <span className="rounded-full bg-sage/10 px-2 py-1 text-xs text-sage">active</span>
                </div>
                <p className="mt-1 text-xs text-foreground/50">{rule.trigger_type} {'->'} {rule.action_type}</p>
              </div>
            ))}
            {!automationRules?.length && <p className="text-sm text-foreground/40">No active automation rules are visible for this event yet.</p>}
          </OpsColumn>
          <OpsColumn title="Recent automation activity">
            {(automationLogs ?? []).map(log => (
              <div key={log.id} className="rounded-lg border border-white/5 p-3">
                <p className="text-sm font-medium">{log.message ?? log.action_type}</p>
                <p className="mt-1 text-xs text-foreground/50">{log.status} · {log.action_type}</p>
              </div>
            ))}
            {!automationLogs?.length && <p className="text-sm text-foreground/40">No automation logs yet. Run the processor or cron to begin proactive coordination.</p>}
          </OpsColumn>
          <OpsColumn title="AI next actions">
            {(aiRecommendations ?? []).map(item => (
              <div key={item.id} className="rounded-lg border border-white/5 p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-foreground/50">{item.recommendation}</p>
              </div>
            ))}
            {!aiRecommendations?.length && <p className="text-sm text-foreground/40">Automation-generated AI recommendations will appear here.</p>}
          </OpsColumn>
        </div>
        {failedAutomation > 0 && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">
            Some automation jobs failed. Open `/admin/ai-ops` to inspect queue errors and retry safely.
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Diaspora context</p>
          <h3 className="mt-2 font-display text-lg font-bold">Local operations lens</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Timezone" value={ev.timezone ?? 'UTC'} />
            <MiniMetric label="Currency" value={eventCurrency} />
            <MiniMetric label="Locale" value={eventLocale} />
            <MiniMetric label="Diaspora hub" value={ev.diaspora_hub ?? ev.country ?? 'Not set'} />
          </div>
          <div className="mt-4 rounded-lg border border-white/5 bg-black/10 p-3 text-sm text-foreground/60">
            Normalized GMV: <span className="font-semibold text-foreground">{formatCurrency(analytics.grossMerchandiseVolume, normalizeCurrency(analytics.currency), eventLocale)}</span>
            {analytics.topContributionCurrencies.length > 0 && (
              <span className="text-foreground/40"> · active currencies: {analytics.topContributionCurrencies.join(', ')}</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">WhatsApp-ready actions</p>
          <h3 className="mt-2 font-display text-lg font-bold">Shareable operations messages</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <WhatsappAction label="Share RSVP link" href={buildWhatsappShareUrl(rsvpMessage, publicEventUrl || publicPath)} />
            <WhatsappAction label="Share contribution link" href={buildWhatsappShareUrl(contributionMessage, publicEventUrl || publicPath)} />
            <WhatsappAction label="Send reminder text" href={buildWhatsappShareUrl(contributionMessage)} />
            <WhatsappAction label="Vendor check-in" href={buildWhatsappShareUrl(vendorCheckinMessage)} />
          </div>
          <div className="mt-4 rounded-lg border border-white/5 bg-black/10 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Preview</p>
            <p className="mt-2 text-sm leading-6 text-foreground/70">{rsvpMessage}</p>
          </div>
          {!!whatsappMessages?.length && (
            <div className="mt-4 grid gap-2">
              {whatsappMessages.map(message => (
                <div key={message.id} className="rounded-lg border border-white/5 bg-black/10 p-3">
                  <p className="text-xs text-foreground/40">{message.status} · {message.channel}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/60">{message.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Event operations center</p>
            <h3 className="mt-2 font-display text-lg font-bold">Check-ins, alerts, and live readiness</h3>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/5 px-3 py-1 text-foreground/60">{checkedInCount}/{checkins?.length ?? 0} checked in</span>
            <span className="rounded-full bg-white/5 px-3 py-1 text-foreground/60">{openAlerts} open alerts</span>
            <span className="rounded-full bg-white/5 px-3 py-1 text-foreground/60">{operationUpdates?.length ?? 0} live updates</span>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <OpsColumn title="QR check-in foundation">
            {(checkins ?? []).map(checkin => (
              <div key={checkin.id} className="rounded-lg border border-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{checkin.participant_name}</p>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{checkin.checked_in ? 'checked in' : 'pending'}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/40">{checkin.participant_type} · QR ready</p>
              </div>
            ))}
            {!checkins?.length && <p className="text-sm text-foreground/40">No check-in records yet. QR schema is ready for guest check-in workflows.</p>}
          </OpsColumn>
          <OpsColumn title="Emergency alerts">
            {(emergencyAlerts ?? []).map(alert => (
              <div key={alert.id} className={`rounded-lg border p-3 ${alert.alert_level === 'critical' ? 'border-red-500/20 bg-red-500/10' : 'border-white/5 bg-white/[0.03]'}`}>
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="mt-1 text-xs leading-5 text-foreground/50">{alert.description}</p>
              </div>
            ))}
            {!emergencyAlerts?.length && <p className="text-sm text-foreground/40">No active emergency alerts.</p>}
          </OpsColumn>
          <OpsColumn title="Live updates">
            {(operationUpdates ?? []).map(update => (
              <div key={update.id} className="rounded-lg border border-white/5 p-3">
                <p className="text-sm font-medium">{update.title}</p>
                {update.body && <p className="mt-1 text-xs leading-5 text-foreground/50">{update.body}</p>}
                <p className="mt-2 text-xs text-foreground/30">{update.update_type}</p>
              </div>
            ))}
            {!operationUpdates?.length && <p className="text-sm text-foreground/40">No live operations updates yet.</p>}
          </OpsColumn>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">AI memory</p>
          <h3 className="mt-2 font-display text-lg font-bold">Recent observations</h3>
          <div className="mt-4 grid gap-3">
            {(aiMemory ?? []).map(memory => (
              <div key={memory.id} className="rounded-lg border border-white/5 p-3">
                <p className="text-sm leading-5 text-foreground/70">{memory.summary}</p>
                <p className="mt-2 text-xs text-foreground/35">{new Date(memory.created_at).toLocaleString(eventLocale, { timeZone: ev.timezone ?? 'UTC' })}</p>
              </div>
            ))}
            {!aiMemory?.length && <p className="text-sm text-foreground/40">No saved AI snapshots yet. Save one when you want Owambe AI to remember this operating state.</p>}
          </div>
        </div>
        <form action={saveAiMemorySnapshot} className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <input type="hidden" name="occasion_id" value={ev.id} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="summary" value={aiHealthSummary.text} />
          <input type="hidden" name="health_score" value={health.overall} />
          <input type="hidden" name="recommendations" value={recommendations.map(item => `${item.title}: ${item.recommendation}`).join('\n')} />
          <input type="hidden" name="top_risks" value={health.topRisks.join('\n')} />
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Memory action</p>
          <h3 className="mt-2 font-display text-lg font-bold">Save AI operations snapshot</h3>
          <p className="mt-3 text-sm leading-6 text-foreground/60">Capture the current health summary, risks, recommendations, and dashboard context for future orchestration.</p>
          <button className="mt-5 rounded-lg bg-pulse px-4 py-2 text-sm font-semibold text-void hover:bg-pulse/90">
            Save snapshot
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Platform analytics</p>
        <h3 className="mt-2 font-display text-lg font-bold">Engagement, funding, and marketplace signals</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MiniMetric label="GMV" value={formatCurrency(analytics.grossMerchandiseVolume, normalizeCurrency(analytics.currency), eventLocale)} />
          <MiniMetric label="RSVP response" value={`${analytics.rsvpResponseRate}%`} />
          <MiniMetric label="Committee coverage" value={`${analytics.committeeCoverage}%`} />
          <MiniMetric label="Vendor needs" value={analytics.vendorCount} />
          <MiniMetric label="Ops alerts" value={analytics.operationalAlerts + openAlerts} />
        </div>
        <div className="mt-4 rounded-lg border border-white/5 bg-black/10 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">AI schedule draft</p>
          <p className="mt-2 text-sm leading-6 text-foreground/70">{aiSchedule.text}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Invitation Studio</p>
              <h3 className="mt-2 font-display text-lg font-bold">{activeInvitation ? activeInvitation.title : 'Create or import an invitation'}</h3>
              <p className="mt-2 text-sm leading-6 text-foreground/60">
                Attach a designed card, uploaded invitation, or generated copy to the public event page and RSVP flow.
              </p>
            </div>
            <Link href={`${base}/invitations`} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-foreground/60 hover:border-white/20">
              Edit
            </Link>
          </div>
          <div className="mt-4">
            {activeInvitation ? (
              <InvitationPreview
                title={activeInvitation.title}
                subtitle={activeInvitation.subtitle}
                body={activeInvitation.body}
                hostNames={activeInvitation.host_names}
                dateTime={ev.event_date ? new Date(ev.event_date).toLocaleString(eventLocale, { dateStyle: 'full', timeStyle: 'short', timeZone: ev.timezone ?? 'UTC' }) : null}
                venueName={activeInvitation.venue_name}
                venueAddress={activeInvitation.venue_address}
                dressCode={activeInvitation.dress_code}
                rsvpNote={activeInvitation.rsvp_note}
                supportNote={activeInvitation.support_note}
                templateId={activeInvitation.template_id}
                fileUrl={activeInvitation.file_url}
                previewUrl={activeInvitation.preview_url}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-foreground/50">
                No active invitation yet. Open Studio to import, design, or generate the first one.
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={buildInvitationWhatsappShareUrl(invitationWhatsappCopy)} target="_blank" rel="noreferrer" className="rounded-lg border border-sage/20 bg-sage/10 px-3 py-2 text-sm font-medium text-sage hover:bg-sage/15">
              Share invitation
            </a>
            <Link href={publicPath} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-foreground/60 hover:border-white/20">
              Public link
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Public service announcements</p>
              <h3 className="mt-2 font-display text-lg font-bold">Pinned and recent updates</h3>
            </div>
            <Link href={`${base}/updates`} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-foreground/60 hover:border-white/20">
              Create
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {(eventAnnouncements ?? []).map(item => (
              <article key={item.id} className={`rounded-lg border p-3 ${item.priority === 'urgent' ? 'border-red-400/30 bg-red-500/10' : item.pinned ? 'border-pulse/30 bg-pulse/10' : 'border-white/5 bg-black/10'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.pinned && <span className="rounded-full bg-pulse/15 px-2 py-0.5 text-[11px] text-pulse">pinned</span>}
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-foreground/50">{item.visibility.replace(/_/g, ' ')}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-foreground/50">{item.priority}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground/60">{item.body}</p>
                {item.share_to_whatsapp_ready && (
                  <a href={buildAnnouncementWhatsappUrl({ eventName: ev.title, title: item.title, body: item.body, link: shareTarget })} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg border border-sage/20 px-3 py-1.5 text-xs text-sage hover:bg-sage/10">
                    Share update
                  </a>
                )}
              </article>
            ))}
            {!eventAnnouncements?.length && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-foreground/50">
                No PSAs yet. Create venue, RSVP, memorial, logistics, or thank-you updates from the Updates page.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Event Gallery</p>
            <h3 className="mt-2 font-display text-lg font-bold">
              {occasionType === 'funeral_memorial' ? 'Memories across the service' : 'Pre-party, main event, and after-party media'}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/60">
              Organize approved photos and videos by lifecycle section, moderate guest uploads, and share the gallery publicly when ready.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(gallerySections?.length ? gallerySections : galleryPresets).map(section => (
                <span key={section.id ?? section.sectionType} className="rounded-full border border-white/10 px-3 py-1 text-xs text-foreground/60">
                  {section.title}
                </span>
              ))}
            </div>
          </div>
          <div className="grid min-w-56 gap-3">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-white/5 bg-black/10 p-3">
                <p className="text-xl font-bold text-sage">{approvedGalleryMedia}</p>
                <p className="text-xs text-foreground/40">approved</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/10 p-3">
                <p className="text-xl font-bold text-amber-200">{pendingGalleryMedia}</p>
                <p className="text-xs text-foreground/40">pending</p>
              </div>
            </div>
            <Link href={`${base}/gallery`} className="rounded-lg bg-pulse px-3 py-2 text-center text-sm font-semibold text-void hover:bg-pulse/90">
              Manage gallery
            </Link>
            <a href={getGalleryWhatsappUrl(galleryShareCopy)} target="_blank" rel="noreferrer" className="rounded-lg border border-sage/20 px-3 py-2 text-center text-sm text-sage hover:bg-sage/10">
              Share gallery
            </a>
          </div>
        </div>
      </section>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Planning workspace</h2>
          <p className="mt-1 text-sm text-foreground/50">Starter checklist, budget, support categories, and vendor needs are ready.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ev.is_public && (
            <Link
              href={`/e/${slug}`}
              className="rounded-lg border border-ocean/30 px-3 py-1.5 text-xs text-ocean hover:bg-ocean/10 transition-colors"
            >
              Share public page →
            </Link>
          )}
          <Link
            href={`/events/${slug}/edit`}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-foreground/50 hover:border-white/20 hover:text-foreground transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {visibleTabs.map(t => (
          <Link
            key={t.href}
            href={`${base}${t.href}`}
            className="px-4 py-2 text-sm font-medium text-foreground/50 hover:text-foreground transition-colors"
          >
            {t.label}
          </Link>
        ))}
      </div>

      {ev.description && (
        <p className="max-w-2xl text-foreground/70 leading-relaxed">{ev.description}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">Generated checklist</h3>
            <Link href={`${base}/tasks`} className="text-xs text-pulse hover:text-pulse/80">Open tasks</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {(checklist ?? []).slice(0, 5).map(task => (
              <div key={task.id} className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${task.priority === 'high' ? theme.accentColor : 'bg-white/20'}`} />
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.description && <p className="mt-1 text-xs leading-5 text-foreground/50">{task.description}</p>}
                </div>
              </div>
            ))}
            {!(checklist?.length) && (
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 text-sm text-foreground/50">
                No starter tasks found yet. Use the Tasks page to add a first item and keep the plan moving.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-bold">Next recommended actions</h3>
          <div className="mt-4 grid gap-3">
            {nextActions.map((action: string, index: number) => (
              <div key={action} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-void ${theme.accentColor}`}>
                  {index + 1}
                </span>
                {action}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">RSVP metrics</h3>
            <Link href={`${base}/guests`} className="text-xs text-pulse hover:text-pulse/80">Open guests</Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-xs text-foreground/40">Accepted</p><p className="text-xl font-bold text-sage">{rsvpAccepted}</p></div>
            <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-xs text-foreground/40">Maybe</p><p className="text-xl font-bold">{rsvpMaybe}</p></div>
            <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-xs text-foreground/40">Declined</p><p className="text-xl font-bold">{rsvpDeclined}</p></div>
          </div>
        </section>

        <section className="rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">Announcements</h3>
            <Link href={`${base}/updates`} className="text-xs text-pulse hover:text-pulse/80">Post update</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {(announcements ?? []).map(item => (
              <div key={item.id} className="rounded-lg border border-white/5 p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-foreground/50">{item.audience} · {item.channel.replace(/_/g, ' ')}</p>
              </div>
            ))}
            {!announcements?.length && <p className="text-sm text-foreground/40">No announcements yet. Post an update to keep guests and contributors informed.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-bold">Owambe AI signals</h3>
          <p className="mt-2 text-sm text-foreground/50">Owambe watches your plan and flags the next high-impact actions so you can stay ahead.</p>
          <div className="mt-4 grid gap-3">
            {recommendations.map(item => (
              <div key={item.id} className="rounded-lg border border-white/5 p-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-foreground/50">{item.reason}</p>
              </div>
            ))}
            {!recommendations.length && <p className="text-sm text-foreground/40">No urgent recommendations. Your current plan looks aligned with what matters most.</p>}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">Budget snapshot</h3>
            <Link href={`${base}/budget`} className="text-xs text-pulse hover:text-pulse/80">Open budget</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(budgetCategories ?? []).map(category => (
              <span key={category.id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-foreground/70">
                {category.name}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-bold">Funding progress</h3>
          <p className="mt-2 text-3xl font-bold text-pulse">{formatMoney(fundedTotal)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white/[0.03] p-2">
              <p className="text-foreground/40">Paid</p>
              <p className="font-semibold text-sage">{formatMoney(totalPaid)}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2">
              <p className="text-foreground/40">Pending</p>
              <p className="font-semibold">{formatMoney(totalPending)}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-2">
              <p className="text-foreground/40">Pledged</p>
              <p className="font-semibold">{formatMoney(totalPledged)}</p>
            </div>
          </div>
          {targetTotal > 0 && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-white/10">
                <div className={`h-full rounded-full ${theme.accentColor}`} style={{ width: `${fundingProgress}%` }} />
              </div>
              <p className="mt-1 text-xs text-foreground/40">{fundingProgress}% of {formatMoney(targetTotal)}</p>
            </div>
          )}
          <div className="mt-4 grid gap-3">
            {(sponsorshipCategories ?? []).map(category => (
              <div key={category.id}>
                <p className="text-sm font-medium">{category.name}</p>
                {category.description && <p className="mt-1 text-xs leading-5 text-foreground/50">{category.description}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">Suggested vendors</h3>
            <Link href={`${base}/vendors`} className="text-xs text-pulse hover:text-pulse/80">Open vendors</Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(vendorNeeds ?? []).map(vendor => (
              <span key={vendor.id} className="rounded-full border border-white/10 px-3 py-1 text-xs text-foreground/70">
                {vendor.category}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-bold">Recent contributions</h3>
          <div className="mt-4 grid gap-3">
            {(contributions ?? []).slice(0, 5).map(contribution => (
              <div key={contribution.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{contribution.is_anonymous ? 'Anonymous supporter' : contribution.contributor_name}</p>
                  <p className="text-sm text-pulse">{formatMoney(contribution.amount)}</p>
                </div>
                <p className="mt-1 text-xs text-foreground/40">{contribution.status}</p>
              </div>
            ))}
            {!contributions?.length && <p className="text-sm text-foreground/40">No pledges yet.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold">Vendor inquiries</h3>
            <Link href={`${base}/vendors`} className="text-xs text-pulse hover:text-pulse/80">Browse</Link>
          </div>
          <div className="mt-4 grid gap-3">
            {(vendorInquiries ?? []).map(inquiry => (
              <div key={inquiry.id} className="rounded-lg border border-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{getVendorDirectoryName(inquiry.vendor_directory)}</p>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{inquiry.status}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/50">{inquiry.message}</p>
              </div>
            ))}
            {!vendorInquiries?.length && <p className="text-sm text-foreground/40">No quote requests yet.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-bold">Memory wall preview</h3>
          <div className="mt-4 grid gap-3">
            {(memoryPosts ?? []).map(post => (
              <div key={post.id} className="rounded-lg border border-white/5 p-3">
                <p className="text-sm leading-5 text-foreground/70">{post.message}</p>
                <p className="mt-2 text-xs text-foreground/40">By {post.author_name}</p>
              </div>
            ))}
            {!memoryPosts?.length && <p className="text-sm text-foreground/40">No memory wall posts yet.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/5 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h3 className="font-display text-lg font-bold">Payout readiness</h3>
            <p className="mt-2 text-sm text-foreground/60">
              Paid balance available for review: <span className="font-semibold text-sage">{formatMoney(availableForPayout)}</span>
            </p>
            <div className="mt-4 grid gap-2 text-sm text-foreground/60 sm:grid-cols-3">
              <div className="rounded-lg border border-white/5 p-3">
                <p className="text-xs text-foreground/40">Account</p>
                <p className="mt-1 font-medium">{payoutAccount?.status ?? 'setup required'}</p>
              </div>
              <div className="rounded-lg border border-white/5 p-3">
                <p className="text-xs text-foreground/40">Charges</p>
                <p className="mt-1 font-medium">{payoutAccount?.charges_enabled ? 'enabled' : 'not enabled'}</p>
              </div>
              <div className="rounded-lg border border-white/5 p-3">
                <p className="text-xs text-foreground/40">Payouts</p>
                <p className="mt-1 font-medium">{payoutAccount?.payouts_enabled ? 'enabled' : 'manual review'}</p>
              </div>
            </div>
            {!!payoutRequests?.length && (
              <div className="mt-4 grid gap-2">
                {payoutRequests.map(request => (
                  <div key={request.id} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm">
                    <span>{formatMoney(request.amount)}</span>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{request.status} · {request.trust_status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Request payout review</p>
            <p className="mt-1 text-xs text-foreground/50">First payout and suspicious activity require admin review. No automated payout is triggered yet.</p>
            <PayoutRequestForm eventId={ev.id} available={availableForPayout} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 p-4">
        <h3 className="font-display text-lg font-bold">Committee role suggestions</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(committeeRoles ?? []).map(role => (
            <div key={role.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
              <p className="text-sm font-medium">{role.role}</p>
              {role.description && <p className="mt-1 text-xs leading-5 text-foreground/50">{role.description}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/5 p-4">
        <h3 className="font-display text-lg font-bold">Activity feed</h3>
        <div className="mt-4 grid gap-3">
          {(activityFeed ?? []).map(activity => (
            <div key={activity.id} className="rounded-lg border border-white/5 p-3">
              <p className="text-sm font-medium">{activity.title}</p>
              {activity.body && <p className="mt-1 text-xs text-foreground/50">{activity.body}</p>}
              <p className="mt-2 text-xs text-foreground/30">{activity.activity_type}</p>
            </div>
          ))}
          {!activityFeed?.length && <p className="text-sm text-foreground/40">No operations activity yet.</p>}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(signals)
          .filter(([, v]) => v)
          .map(([key]) => (
            <div key={key} className="rounded-lg border border-sage/20 bg-sage/5 px-4 py-3">
              <span className="text-xs font-medium text-sage">{key.replace('has_', '').replace(/_/g, ' ')}</span>
            </div>
          ))}
      </div>

      {!ev.alice_unlocked && (
        <AliceUnlockCard eventId={ev.id} />
      )}
    </div>
  )
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function getVendorDirectoryName(value: unknown) {
  const record = Array.isArray(value) ? value[0] : value
  return typeof record === 'object' && record !== null && 'name' in record
    ? String((record as { name?: unknown }).name ?? 'Vendor')
    : 'Vendor'
}

function WhatsappAction({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-lg border border-sage/20 bg-sage/10 px-3 py-2 text-sm font-medium text-sage hover:bg-sage/15"
    >
      {label}
    </a>
  )
}

function OpsColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/10 p-4">
      <h4 className="text-sm font-semibold text-foreground/80">{title}</h4>
      <div className="mt-3 grid gap-3">{children}</div>
    </div>
  )
}
