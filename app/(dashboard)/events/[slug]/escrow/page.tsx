import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EscrowControls } from '@/components/escrow/escrow-controls'

const STATUS_STYLE: Record<string, string> = {
  credit:            'text-sage',
  allocation:        'text-pulse',
  allocation_cancel: 'text-foreground/40',
  payout_debit:      'text-red-400',
  refund:            'text-ocean',
}

export default async function EscrowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: event } = await supabase
    .from('events').select('id, title').eq('slug', slug).eq('owner_id', user!.id).single()
  if (!event) notFound()

  const admin = createAdminClient()

  const [
    { data: escrow },
    { data: allocations },
    { data: payouts },
    { data: ledger },
    { data: vendors },
  ] = await Promise.all([
    admin.from('escrow_accounts').select('*').eq('event_id' as const, event.id).single(),
    admin.from('vendor_allocations').select('*, vendors(name)').eq('event_id' as const, event.id).order('created_at', { ascending: false }),
    admin.from('vendor_payouts').select('*').eq('event_id' as const, event.id).order('created_at', { ascending: false }),
    admin.from('escrow_transactions').select('*').eq('event_id' as const, event.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('vendors').select('id, name, category').eq('event_id' as const, event.id),
  ])

  const balance = Number(escrow?.balance ?? 0)
  const allocated = Number(escrow?.total_allocated ?? 0)
  const released = Number(escrow?.total_released ?? 0)
  const available = balance - allocated

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Escrow & Payouts</h2>
        {escrow && (
          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
            escrow.status === 'active' ? 'bg-sage/10 text-sage' :
            escrow.status === 'frozen' ? 'bg-pulse/10 text-pulse' : 'bg-white/5 text-foreground/40'
          }`}>{escrow.status}</span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Escrow balance', value: balance, color: 'text-sage' },
          { label: 'Allocated', value: allocated, color: 'text-pulse' },
          { label: 'Available', value: available, color: available > 0 ? 'text-ocean' : 'text-foreground/40' },
          { label: 'Released', value: released, color: 'text-foreground/60' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/5 p-4">
            <p className="text-xs text-foreground/40">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>₦{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {!escrow ? (
        <div className="rounded-xl border border-white/5 p-8 text-center">
          <p className="text-sm text-foreground/40">No escrow account yet. Verify a payment to initialise.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-white/5 p-5">
            <h3 className="mb-4 text-sm font-semibold">Allocations & Payouts</h3>
            <EscrowControls
              eventId={event.id}
              vendors={vendors ?? []}
              allocations={(allocations ?? []) as unknown as Parameters<typeof EscrowControls>[0]['allocations']}
              available={available}
            />
          </div>

          {/* Payouts list */}
          {payouts && payouts.length > 0 && (
            <div className="rounded-xl border border-white/5 p-5">
              <h3 className="mb-4 text-sm font-semibold">Payout History</h3>
              <div className="flex flex-col gap-2">
                {payouts.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 p-3">
                    <div>
                      <p className="text-sm font-medium">₦{Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-foreground/40 capitalize">{p.provider} · {p.provider_reference ?? 'manual'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      p.status === 'completed' ? 'bg-sage/10 text-sage' :
                      p.status === 'processing' ? 'bg-ocean/10 text-ocean' :
                      p.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-white/5 text-foreground/40'
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ledger */}
          {ledger && ledger.length > 0 && (
            <details className="rounded-xl border border-white/5">
              <summary className="cursor-pointer p-4 text-sm font-medium text-foreground/60 hover:text-foreground">
                Audit ledger ({ledger.length} entries)
              </summary>
              <div className="border-t border-white/5 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-foreground/40">
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">Balance after</th>
                      <th className="px-4 py-2 text-right">Available after</th>
                      <th className="px-4 py-2 text-left">Ref</th>
                      <th className="px-4 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map(tx => (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className={`px-4 py-2 font-medium ${STATUS_STYLE[tx.type] ?? ''}`}>{tx.type}</td>
                        <td className="px-4 py-2 text-right font-mono">₦{Number(tx.amount).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-mono text-foreground/60">₦{Number(tx.balance_after).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-mono text-foreground/60">₦{Number(tx.available_after).toLocaleString()}</td>
                        <td className="px-4 py-2 text-foreground/40 truncate max-w-[120px]">{tx.reference ?? '—'}</td>
                        <td className="px-4 py-2 text-foreground/30">{new Date(tx.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
