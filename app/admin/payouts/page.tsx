import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminPayoutsPage() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: payouts } = await admin
    .from('payout_requests')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(50)

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Payout requests</h1>
      <div className="mt-6 grid gap-3">
        {(payouts ?? []).map(payout => (
          <div key={payout.id} className="rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">Event payout · {payout.occasion_id}</p>
              <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{payout.status} · {payout.trust_status}</span>
            </div>
            <p className="mt-1 text-sm text-foreground/50">${(Number(payout.amount) / 100).toFixed(2)} {payout.currency}</p>
            {payout.rejection_reason && <p className="mt-2 text-sm text-red-300">{payout.rejection_reason}</p>}
          </div>
        ))}
        {!payouts?.length && <p className="text-sm text-foreground/40">No payout requests yet.</p>}
      </div>
    </main>
  )
}
