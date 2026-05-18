import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getOccasionTheme } from '@/lib/occasion/theme-config'
import type { OccasionType } from '@/lib/occasion/occasion-types'
import { formatCurrency } from '@/lib/utils'
import { PledgeForm } from '@/components/public/pledge-form'
import { MemoryWallForm } from '@/components/public/memory-wall-form'
import type { Event } from '@/types'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('title, description')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  return {
    title: event ? `${event.title} — Ówàmbẹ̀` : 'Ówàmbẹ̀',
    description: event?.description ?? "You're invited! View the event details and gift registry.",
  }
}

export default async function GuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!event) notFound()

  const ev = event as unknown as Event
  const occasionType = (ev.occasion_type ?? 'custom') as OccasionType
  const theme = getOccasionTheme(occasionType)
  const respectful = occasionType === 'funeral_memorial'

  const [
    { data: categories },
    { data: contributions },
    { data: memoryPosts },
    { data: updates },
  ] = await Promise.all([
    supabase
      .from('sponsorship_categories')
      .select('id, name, description, target_amount, funded_amount, status')
      .eq('occasion_id', ev.id)
      .eq('status', 'open')
      .order('created_at'),
    supabase.rpc('get_public_contribution_summaries', { p_occasion_id: ev.id, p_limit: 6 }),
    supabase
      .from('memory_posts')
      .select('id, author_name, message, post_type, created_at')
      .eq('occasion_id', ev.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('event_updates')
      .select('id, title, body, created_at')
      .eq('occasion_id', ev.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(4),
  ])
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/e/${slug}`
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Join us for ${ev.title}: ${publicUrl || `/e/${slug}`}`)}`

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12">
      <div className={`rounded-2xl border ${theme.cardBorder} ${theme.bgClass} p-6`}>
        <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${theme.primaryColor}`}>{theme.label}</p>
        <h1 className="font-display text-4xl font-bold">{ev.title}</h1>
        {ev.event_date && (
          <p className="mt-3 text-foreground/60">
            {new Date(ev.event_date).toLocaleDateString('en-US', { dateStyle: 'full' })}
          </p>
        )}
        {ev.location && <p className="text-foreground/50">{ev.location}</p>}
        {ev.description && <p className="mt-2 leading-relaxed text-foreground/70">{ev.description}</p>}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-sage/30 bg-sage/5 px-4 py-2 text-sm font-semibold text-sage hover:bg-sage/10">
            Share on WhatsApp
          </a>
          <a href="#pledge" className="inline-flex rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-foreground hover:border-white/20">
            Pledge support
          </a>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Support the celebration</p>
            <p className="mt-2 text-lg font-semibold text-foreground">Share this event, then pick a sponsorship category to contribute.</p>
          </div>
          <p className="text-sm text-foreground/60">
            Invite friends on WhatsApp or scroll down to support with a contribution, message, or memory.
          </p>
        </div>
      </section>

      {!!updates?.length && (
        <section className="rounded-xl border border-white/5 p-4">
          <h2 className="font-display text-2xl font-semibold">Event updates</h2>
          <div className="mt-4 grid gap-3">
            {updates.map(update => (
              <article key={update.id} className="rounded-lg border border-white/5 p-3">
                <p className="font-medium">{update.title}</p>
                <p className="mt-1 text-sm leading-6 text-foreground/60">{update.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">{respectful ? 'Family support' : 'Sponsorships'}</h2>
            <p className="mt-1 text-sm text-foreground/60">
              {respectful ? 'Support the family with care, welfare, and remembrance needs.' : 'Choose a category and pledge support for this occasion.'}
            </p>
          </div>
          <div className="grid gap-3">
            {(categories ?? []).map(category => {
              const funded = Number(category.funded_amount ?? 0)
              const target = Number(category.target_amount ?? 0)
              const pct = target > 0 ? Math.min(100, Math.round((funded / target) * 100)) : 0

              return (
                <div key={category.id} className="rounded-xl border border-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{category.name}</p>
                      {category.description && <p className="mt-1 text-sm text-foreground/50">{category.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-pulse">{formatCurrency(funded)}</span>
                  </div>
                  {target > 0 && (
                    <div className="mt-3">
                      <div className="h-2 rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${theme.accentColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-foreground/40">Goal {formatCurrency(target)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {!categories?.length && (
            <div className="rounded-xl border border-white/5 p-4 text-sm text-foreground/50">
              No support categories are open right now. Please reach out to the host if you would like to contribute.
            </div>
          )}
          {!!contributions?.length && (
            <div className="rounded-xl border border-white/5 p-4">
              <h3 className="font-display text-lg font-semibold">Recent support</h3>
              <div className="mt-3 grid gap-3">
                {contributions.map(contribution => (
                  <div key={contribution.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{contribution.display_name}</p>
                      <p className="text-sm text-pulse">{formatCurrency(contribution.amount)}</p>
                    </div>
                    {contribution.message && <p className="mt-1 text-xs text-foreground/50">{contribution.message}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 id="pledge" className="mb-4 font-display text-2xl font-semibold">Pledge support</h2>
          <PledgeForm eventId={ev.id} categories={(categories ?? []).map(category => ({
            id: category.id,
            name: category.name,
            description: category.description,
          }))} />
        </section>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
        <div>
          <h2 className="font-display text-2xl font-semibold">{respectful ? 'Tribute wall' : 'Memory wall'}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            {respectful ? 'Share a memory, prayer, or condolence with the family.' : 'Leave a note, blessing, or favorite memory.'}
          </p>
          <div className="mt-4">
            <MemoryWallForm eventId={ev.id} respectful={respectful} />
          </div>
        </div>
        <div className="grid gap-3">
          {(memoryPosts ?? []).map(post => (
            <article key={post.id} className="rounded-xl border border-white/5 p-4">
              <p className="text-sm leading-6 text-foreground/80">{post.message}</p>
              <p className="mt-3 text-xs text-foreground/40">By {post.author_name}</p>
            </article>
          ))}
          {!memoryPosts?.length && (
            <div className="rounded-xl border border-white/5 p-6 text-sm text-foreground/40">
              {respectful ? 'No tributes yet.' : 'No memories yet.'}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
