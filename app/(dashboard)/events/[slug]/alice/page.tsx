import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AliceCalibrationForm } from '@/components/alice/alice-calibration-form'
import { AliceBudgetView } from '@/components/alice/alice-budget-view'
import { AliceAveTracker } from '@/components/alice/alice-ave-tracker'
import { AliceAlerts } from '@/components/alice/alice-alerts'
import { AliceT7Checklist } from '@/components/alice/alice-t7-checklist'
import { AliceBurnRateTracker } from '@/components/alice/alice-burn-rate'
import { AliceVendorScorecard } from '@/components/alice/alice-vendor-scorecard'
import { AliceGuestScore } from '@/components/alice/alice-guest-score'
import { runAliceMonitor } from '@/app/actions/alice'
import type { EventContext, EventFacets, BudgetLine, VendorCrew, EventInventory, GuestExperienceScore } from '@/types'

const AREA_LABELS: Record<string, string> = {
  premium: 'Premium ×1.8',
  urban: 'Urban ×1.3',
  state_capital: 'State Capital ×1.0',
  other: 'Other ×0.85',
}

export default async function AlicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, alice_unlocked, signals, event_date')
    .eq('slug', slug)
    .eq('owner_id', user!.id)
    .single()

  if (!event) notFound()
  if (!event.alice_unlocked) redirect(`/events/${slug}`)

  const [
    { data: ctxRaw },
    { data: facetsRaw },
    { data: alerts },
    { data: budgetLines },
    { data: vendors },
    { data: crew },
    { data: inventory },
    { data: guestScore },
  ] = await Promise.all([
    supabase.from('event_context').select('*').eq('event_id', event.id).single(),
    supabase.from('event_facets').select('*').eq('event_id', event.id).single(),
    supabase.from('alice_alerts').select('*').eq('event_id', event.id).eq('resolved', false).order('created_at', { ascending: false }),
    supabase.from('budget_lines').select('*').eq('event_id', event.id),
    supabase.from('vendors').select('*').eq('event_id', event.id),
    supabase.from('vendor_crew').select('*').eq('event_id', event.id).order('created_at'),
    supabase.from('event_inventory').select('*').eq('event_id', event.id).order('facet'),
    supabase.from('guest_experience_scores').select('*').eq('event_id', event.id).single(),
  ])

  const ctx = ctxRaw as EventContext | null
  const facets = facetsRaw
    ? { ...facetsRaw, allocations: (facetsRaw.allocations ?? {}) as Record<string, number>, ave_data: (facetsRaw.ave_data ?? {}) as EventFacets['ave_data'] }
    : null

  const eventDateMs = event.event_date ? new Date(event.event_date).getTime() : null
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const daysToEvent = eventDateMs ? Math.ceil((eventDateMs - now) / 86400000) : null
  const showT7 = daysToEvent !== null && daysToEvent <= 7 && daysToEvent >= 0
  const isDDay = daysToEvent === 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">🧠 ALICE</h2>
        <div className="flex items-center gap-2">
          {isDDay && <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">D-Day</span>}
          {showT7 && !isDDay && <span className="rounded-full bg-pulse/10 px-3 py-1 text-xs font-medium text-pulse">T-{daysToEvent}</span>}
          <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-medium text-sage">Active</span>
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <AliceAlerts alerts={alerts} slug={slug} />
      )}

      {!ctx ? (
        <AliceCalibrationForm eventId={event.id} slug={slug} />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Budget summary */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/5 p-4">
              <p className="text-xs text-foreground/40">Guests</p>
              <p className="mt-1 text-2xl font-bold">{ctx.guest_count}</p>
            </div>
            <div className="rounded-xl border border-white/5 p-4">
              <p className="text-xs text-foreground/40">Style · Area</p>
              <p className="mt-1 text-sm font-bold capitalize">{ctx.style_tier}</p>
              <p className="text-xs text-foreground/40">{AREA_LABELS[ctx.location_area] ?? ctx.location_area}</p>
            </div>
            <div className="rounded-xl border border-white/5 p-4">
              <p className="text-xs text-foreground/40">Event type</p>
              <p className="mt-1 text-sm font-bold capitalize">{ctx.event_type}</p>
              {ctx.face_priority && <p className="text-xs text-pulse">Face priority on</p>}
            </div>
            <div className="rounded-xl border border-white/5 p-4">
              <p className="text-xs text-foreground/40">ALICE Budget</p>
              <p className="mt-1 text-2xl font-bold text-sage">
                {facets ? `₦${Number(facets.final_total).toLocaleString()}` : '—'}
              </p>
              <p className="text-xs text-foreground/30">incl. 20.38% inflation buffer</p>
            </div>
          </div>

          {facets && (
            <div className="rounded-xl border border-white/5 p-5">
              <h3 className="mb-4 text-sm font-semibold">Budget Breakdown</h3>
              <AliceBudgetView facets={{ ...facets, allocations: facets.allocations as Record<string, number> }} />
            </div>
          )}

          {/* AvE Tracker */}
          {facets && (
            <div className="rounded-xl border border-white/5 p-5">
              <h3 className="mb-4 text-sm font-semibold">Actual vs. Expected (AvE)</h3>
              <AliceAveTracker
                facets={facets as unknown as EventFacets}
                budgetLines={(budgetLines ?? []) as BudgetLine[]}
              />
            </div>
          )}

          {/* T-7 Lockdown */}
          {(showT7 || (crew && crew.length > 0)) && (
            <div className="rounded-xl border border-white/5 p-5">
              <AliceT7Checklist
                crew={(crew ?? []) as VendorCrew[]}
                vendors={(vendors ?? []) as unknown as import('@/types').Vendor[]}
                eventId={event.id}
                slug={slug}
              />
            </div>
          )}

          {/* D-Day Burn Rate */}
          {(isDDay || (inventory && inventory.length > 0)) && (
            <div className="rounded-xl border border-white/5 p-5">
              <AliceBurnRateTracker
                items={(inventory ?? []) as EventInventory[]}
                eventId={event.id}
                slug={slug}
              />
            </div>
          )}

          {/* Run monitor */}
          <form action={runAliceMonitor.bind(null, event.id, slug)}>
            <button type="submit"
              className="w-full rounded-lg border border-white/10 py-2.5 text-sm text-foreground/60 hover:border-white/20 hover:text-foreground transition-colors">
              Run ALICE monitor
            </button>
          </form>

          {/* Post-event */}
          {vendors && vendors.length > 0 && (
            <details className="rounded-xl border border-white/5">
              <summary className="cursor-pointer p-4 text-sm font-medium text-foreground/60 hover:text-foreground">
                Post-event: Vendor Scorecards
              </summary>
              <div className="border-t border-white/5 p-4">
                <AliceVendorScorecard vendors={vendors as unknown as import('@/types').Vendor[]} eventId={event.id} slug={slug} />
              </div>
            </details>
          )}

          <details className="rounded-xl border border-white/5">
            <summary className="cursor-pointer p-4 text-sm font-medium text-foreground/60 hover:text-foreground">
              Post-event: Guest Experience Score
            </summary>
            <div className="border-t border-white/5 p-4">
              <AliceGuestScore
                existing={(guestScore ?? null) as GuestExperienceScore | null}
                eventId={event.id}
                slug={slug}
              />
            </div>
          </details>

          <details className="rounded-xl border border-white/5">
            <summary className="cursor-pointer p-4 text-sm font-medium text-foreground/60 hover:text-foreground">
              Re-calibrate
            </summary>
            <div className="border-t border-white/5 p-4">
              <AliceCalibrationForm eventId={event.id} slug={slug} defaultValues={ctx} />
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
