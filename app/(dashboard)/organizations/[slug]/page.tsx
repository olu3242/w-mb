import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OrganizationMemberForm } from '@/components/organizations/organization-member-form'
import { OrganizationFundForm } from '@/components/organizations/organization-fund-form'
import { OrganizationEventLinkForm } from '@/components/organizations/organization-event-link-form'
import { buildOrganizationAiContext } from '@/lib/organization/analytics'
import { formatCurrency, toBaseCurrency } from '@/lib/currency'

export default async function OrganizationDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: org } = await supabase.from('organizations').select('*').eq('slug', slug).single()
  if (!org) notFound()

  const [
    { data: members },
    { data: funds },
    { data: orgEvents },
    { data: announcements },
    { data: activity },
    { data: personalEvents },
    { data: aiSnapshots },
    { data: automationQueue },
    { data: automationLogs },
    { data: automationRules },
  ] = await Promise.all([
    supabase.from('organization_members').select('*').eq('organization_id', org.id).order('joined_at', { ascending: false }),
    supabase.from('organization_funds').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }),
    supabase.from('organization_events').select('*, events(id, title, slug, event_date, currency, timezone, country, diaspora_hub)').eq('organization_id', org.id).order('created_at', { ascending: false }),
    supabase.from('organization_announcements').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('organization_activity').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('events').select('id, title').eq('owner_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('organization_ai_context').select('*').eq('organization_id', org.id).order('generated_at', { ascending: false }).limit(3),
    supabase.from('automation_queue').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('automation_logs').select('*').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('automation_rules').select('*').or(`organization_id.eq.${org.id},organization_id.is.null`).eq('is_active', true).limit(8),
  ])

  const fundBalance = funds?.reduce((sum, fund) => sum + Number(fund.balance), 0) ?? 0
  const eventRecords = (orgEvents ?? []).flatMap(link => {
    const event = Array.isArray(link.events) ? link.events[0] : link.events
    return event ? [event] : []
  })
  const eventIds = eventRecords.map(event => event.id)
  const [{ data: contributions }, { data: guests }, { data: vendorInquiries }] = await Promise.all([
    eventIds.length ? supabase.from('contributions').select('amount, currency, status').in('occasion_id', eventIds) : Promise.resolve({ data: [] }),
    eventIds.length ? supabase.from('event_guests').select('status, guest_count').in('occasion_id', eventIds) : Promise.resolve({ data: [] }),
    eventIds.length ? supabase.from('vendor_inquiries').select('id, status').in('occasion_id', eventIds) : Promise.resolve({ data: [] }),
  ])
  const normalizedPaid = (contributions ?? [])
    .filter(contribution => contribution.status === 'paid')
    .reduce((sum, contribution) => sum + toBaseCurrency(Number(contribution.amount), contribution.currency ?? 'USD', 'USD'), 0)
  const acceptedGuests = (guests ?? []).filter(guest => guest.status === 'accepted').reduce((sum, guest) => sum + Number(guest.guest_count ?? 0), 0)
  const activeVendorLeads = (vendorInquiries ?? []).filter(inquiry => inquiry.status !== 'closed').length
  const pendingAutomations = automationQueue?.filter(item => ['pending', 'queued', 'processing'].includes(item.status)).length ?? 0
  const failedAutomations = automationQueue?.filter(item => item.status === 'failed').length ?? 0
  const aiContext = buildOrganizationAiContext({
    activeEvents: orgEvents?.length ?? 0,
    memberCount: members?.length ?? 0,
    fundBalance,
    announcementCount: announcements?.length ?? 0,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{org.organization_type.replace(/_/g, ' ')}</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{org.name}</h1>
        {org.description && <p className="mt-2 max-w-2xl text-sm text-foreground/60">{org.description}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric label="Members" value={members?.length ?? 0} />
        <Metric label="Events" value={orgEvents?.length ?? 0} />
        <Metric label="Funds" value={funds?.length ?? 0} />
        <Metric label="Balance" value={`$${(fundBalance / 100).toFixed(0)}`} />
      </div>

      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Organization AI summary</p>
        <h2 className="mt-2 font-display text-lg font-semibold">Community operations health</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/60">
          {org.name} has {members?.length ?? 0} active member records, {orgEvents?.length ?? 0} linked event{orgEvents?.length === 1 ? '' : 's'}, and {formatCurrency(normalizedPaid, 'USD')} in normalized paid event contributions.
          Member engagement is {acceptedGuests > 0 ? 'active through RSVP responses' : 'ready for invitation and RSVP follow-up'}, with {activeVendorLeads} vendor lead{activeVendorLeads === 1 ? '' : 's'} still operational.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Normalized GMV" value={formatCurrency(normalizedPaid, 'USD')} />
          <Metric label="Accepted RSVPs" value={acceptedGuests} />
          <Metric label="Vendor leads" value={activeVendorLeads} />
          <Metric label="Timezone" value={org.timezone ?? 'UTC'} />
          <Metric label="Country" value={org.country ?? 'Not set'} />
        </div>
      </section>

      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Organization Automation OS</p>
        <h2 className="mt-2 font-display text-lg font-semibold">Recurring events, fund prompts, and member engagement</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Active rules" value={automationRules?.length ?? 0} />
          <Metric label="Pending jobs" value={pendingAutomations} />
          <Metric label="Failed jobs" value={failedAutomations} />
          <Metric label="Recent logs" value={automationLogs?.length ?? 0} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/5 p-4">
            <h3 className="text-sm font-semibold">Recurring event reminders</h3>
            <div className="mt-3 grid gap-2">
              {(automationRules ?? []).filter(rule => rule.trigger_type === 'organization_event_due').map(rule => (
                <div key={rule.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                  <p>{rule.title ?? rule.id}</p>
                  <p className="mt-1 text-xs text-foreground/50">{rule.action_type}</p>
                </div>
              ))}
              {!(automationRules ?? []).some(rule => rule.trigger_type === 'organization_event_due') && (
                <p className="text-sm text-foreground/40">Default recurring event reminders will appear after migration/seed runs.</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 p-4">
            <h3 className="text-sm font-semibold">Member engagement alerts</h3>
            <div className="mt-3 grid gap-2">
              {(automationLogs ?? []).slice(0, 4).map(log => (
                <div key={log.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                  <p>{log.message ?? log.action_type}</p>
                  <p className="mt-1 text-xs text-foreground/50">{log.status}</p>
                </div>
              ))}
              {!automationLogs?.length && <p className="text-sm text-foreground/40">No organization automation activity yet.</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-4">
          <OrganizationMemberForm organizationId={org.id} />
          <OrganizationFundForm organizationId={org.id} />
          <OrganizationEventLinkForm organizationId={org.id} events={(personalEvents ?? []).map(event => ({ id: event.id, title: event.title }))} />
        </div>

        <div className="grid gap-4">
          <section className="rounded-xl border border-white/5 p-4">
            <h2 className="font-display text-lg font-semibold">Active & recurring events</h2>
            <div className="mt-3 grid gap-3">
              {(orgEvents ?? []).map(link => {
                const event = Array.isArray(link.events) ? link.events[0] : link.events
                return (
                  <div key={link.occasion_id} className="rounded-lg border border-white/5 p-3">
                    <Link href={event?.slug ? `/events/${event.slug}` : '#'} className="font-medium text-pulse">{event?.title ?? 'Event'}</Link>
                    <p className="mt-1 text-xs text-foreground/50">
                      {link.recurrence_label ?? link.recurrence_rule ?? 'One-time'} · {event?.timezone ?? org.timezone ?? 'UTC'} · {event?.currency ?? 'USD'}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-xl border border-white/5 p-4">
            <h2 className="font-display text-lg font-semibold">Contribution pools</h2>
            <div className="mt-3 grid gap-3">
              {(funds ?? []).map(fund => (
                <div key={fund.id} className="flex items-center justify-between rounded-lg border border-white/5 p-3">
                  <div>
                    <p className="font-medium">{fund.name}</p>
                    <p className="text-xs text-foreground/50">{fund.fund_type.replace(/_/g, ' ')}</p>
                  </div>
                  <p className="text-sm text-sage">${(Number(fund.balance) / 100).toFixed(0)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-white/5 p-4">
          <h2 className="font-display text-lg font-semibold">Members & leadership</h2>
          <div className="mt-3 grid gap-2">
            {(members ?? []).slice(0, 6).map(member => (
              <div key={member.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                <p>{member.name ?? member.email ?? 'Member'}</p>
                <p className="text-xs text-foreground/50">{member.role} · {member.status}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-white/5 p-4">
          <h2 className="font-display text-lg font-semibold">Organization AI context</h2>
          <div className="mt-3 grid gap-2 text-sm text-foreground/60">
            {Object.entries(aiContext).map(([key, value]) => <p key={key}>{key}: <span className="text-foreground">{value}</span></p>)}
          </div>
          <div className="mt-4 grid gap-2">
            {(aiSnapshots ?? []).map(snapshot => (
              <div key={snapshot.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                <p className="text-foreground/70">{snapshot.context_type.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-xs text-foreground/40">{new Date(snapshot.generated_at).toLocaleString()}</p>
              </div>
            ))}
            {!aiSnapshots?.length && <p className="text-sm text-foreground/40">No saved organization AI context snapshots yet.</p>}
          </div>
        </section>
        <section className="rounded-xl border border-white/5 p-4">
          <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          <div className="mt-3 grid gap-2">
            {(activity ?? []).map(item => (
              <div key={item.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                <p>{item.title}</p>
                {item.body && <p className="text-xs text-foreground/50">{item.body}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/5 p-4">
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
