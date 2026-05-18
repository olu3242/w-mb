import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ contribution_id?: string }>
}) {
  const { contribution_id: contributionId } = await searchParams
  const admin = createAdminClient()
  const { data: contribution } = contributionId
    ? await admin
      .from('contributions')
      .select('id, status, occasion_id')
      .eq('id', contributionId)
      .single()
    : { data: null }

  const { data: event } = contribution?.occasion_id
    ? await admin.from('events').select('slug, title').eq('id', contribution.occasion_id).single()
    : { data: null }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="rounded-2xl border border-sage/20 bg-sage/5 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">Contribution received</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Thank you for supporting this occasion.</h1>
        <p className="mt-3 text-sm text-foreground/60">
          {contribution?.status === 'paid'
            ? 'Your payment is confirmed.'
            : 'Stripe is finalizing your payment. The event page will update once the webhook confirms it.'}
        </p>
        {event?.slug && (
          <Link href={`/e/${event.slug}`} className="mt-6 inline-flex rounded-lg bg-pulse px-4 py-2 text-sm font-semibold text-void">
            Back to event page
          </Link>
        )}
      </div>
    </main>
  )
}
