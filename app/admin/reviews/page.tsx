import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminReviewsPage() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: reviews } = await admin
    .from('admin_reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold">Admin reviews</h1>
      <div className="mt-6 grid gap-3">
        {(reviews ?? []).map(review => (
          <div key={review.id} className="rounded-xl border border-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{review.review_type ?? 'review'}</p>
              <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{review.status} · {review.priority}</span>
            </div>
            <p className="mt-1 text-sm text-foreground/50">{review.subject_type} · {review.subject_id}</p>
            {review.notes && <p className="mt-2 text-sm text-foreground/70">{review.notes}</p>}
          </div>
        ))}
        {!reviews?.length && <p className="text-sm text-foreground/40">No reviews yet.</p>}
      </div>
    </main>
  )
}
