import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ contribution_id?: string }>
}) {
  const { contribution_id: contributionId } = await searchParams
  const admin = createAdminClient()
  const { data: contribution } = contributionId
    ? await admin
      .from('contributions')
      .select('id, occasion_id')
      .eq('id', contributionId)
      .single()
    : { data: null }

  const { data: event } = contribution?.occasion_id
    ? await admin.from('events').select('slug, title').eq('id', contribution.occasion_id).single()
    : { data: null }

  if (contributionId) {
    await admin
      .from('contributions')
      .update({ status: 'cancelled' })
      .eq('id', contributionId)
      .eq('status', 'pending')
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">Checkout cancelled</p>
        <h1 className="mt-3 font-display text-3xl font-bold">No payment was completed.</h1>
        <p className="mt-3 text-sm text-foreground/60">You can return to the event page and try again whenever you are ready.</p>
        {event?.slug && (
          <Link href={`/e/${event.slug}`} className="mt-6 inline-flex rounded-lg bg-pulse px-4 py-2 text-sm font-semibold text-void">
            Try again
          </Link>
        )}
      </div>
    </main>
  )
}
