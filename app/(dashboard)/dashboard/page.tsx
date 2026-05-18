import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, normalizeCurrency, toBaseCurrency } from '@/lib/currency'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, slug, signals, currency, timezone, country, diaspora_hub')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5)
  const eventIds = events?.map(event => event.id) ?? []
  const [{ data: contributions }, { data: vendorInquiries }, { data: guests }, { data: organizations }] = await Promise.all([
    eventIds.length
      ? supabase.from('contributions').select('amount, currency, status').in('occasion_id', eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase.from('vendor_inquiries').select('id').in('occasion_id', eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase.from('event_guests').select('status, guest_count').in('occasion_id', eventIds)
      : Promise.resolve({ data: [] }),
    supabase.from('organization_members').select('organization_id').eq('user_id', user!.id).eq('status', 'active'),
  ])
  const paidGmv = (contributions ?? [])
    .filter(contribution => contribution.status === 'paid')
    .reduce((sum, contribution) => sum + toBaseCurrency(Number(contribution.amount), contribution.currency ?? 'USD', 'USD'), 0)
  const acceptedGuests = (guests ?? [])
    .filter(guest => guest.status === 'accepted')
    .reduce((sum, guest) => sum + Number(guest.guest_count ?? 0), 0)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <Link
          href="/events/new"
          className="rounded-lg bg-pulse px-4 py-2 text-sm font-semibold text-void hover:bg-pulse/90 transition-colors"
        >
          + New event
        </Link>
      </div>
      <section className="grid gap-4 lg:grid-cols-4">
        <Metric label="Portfolio GMV" value={formatCurrency(paidGmv, 'USD')} />
        <Metric label="Events" value={events?.length ?? 0} />
        <Metric label="Vendor leads" value={vendorInquiries?.length ?? 0} />
        <Metric label="Accepted RSVPs" value={acceptedGuests} />
      </section>
      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Owambe AI platform summary</p>
        <h2 className="mt-2 font-display text-lg font-bold">Operations portfolio</h2>
        <p className="mt-3 text-sm leading-6 text-foreground/60">
          You are coordinating {events?.length ?? 0} active event surfaces across {organizations?.length ?? 0} organization workspace{organizations?.length === 1 ? '' : 's'}.
          Paid contributions normalize to {formatCurrency(paidGmv, 'USD')} with {vendorInquiries?.length ?? 0} vendor lead signal{vendorInquiries?.length === 1 ? '' : 's'} ready for follow-up.
        </p>
      </section>
      <section>
        <h2 className="mb-4 text-sm font-medium text-foreground/50 uppercase tracking-wider">Recent events</h2>
        {!events?.length ? (
          <div className="rounded-xl border border-white/5 p-12 text-center text-foreground/40">
            No events yet.{' '}
            <Link href="/events/new" className="text-pulse hover:underline">Create one →</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(ev => (
              <Link
                key={ev.id}
                href={`/events/${ev.slug}`}
                className="flex items-center justify-between rounded-xl border border-white/5 p-4 hover:border-pulse/20 hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-medium">{ev.title}</span>
                {ev.event_date && (
                  <span className="text-sm text-foreground/40">
                    {new Date(ev.event_date).toLocaleDateString('en-US', { timeZone: ev.timezone ?? 'UTC' })}
                  </span>
                )}
                <span className="text-xs text-foreground/35">{normalizeCurrency(ev.currency ?? 'USD')} · {ev.diaspora_hub ?? ev.country ?? 'local'}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
