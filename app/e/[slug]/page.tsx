import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getOccasionTheme } from '@/lib/occasion/theme-config'
import type { OccasionType } from '@/lib/occasion/occasion-types'
import { formatCurrency } from '@/lib/utils'
import { PledgeForm } from '@/components/public/pledge-form'
import { MemoryWallForm } from '@/components/public/memory-wall-form'
import { InvitationPreview } from '@/components/invitations/invitation-preview'
import { generateInvitationCopy, buildWhatsappShareUrl } from '@/lib/invitations/generator'
import { buildAnnouncementWhatsappUrl } from '@/lib/announcements/templates'
import { GalleryPublic, type GalleryMediaRecord, type GallerySectionRecord } from '@/components/gallery/gallery-public'
import { GalleryUploadForm } from '@/components/gallery/gallery-upload-form'
import type { Event } from '@/types'

type PublicContribution = {
  id: string
  display_name: string
  amount: number
  message?: string | null
}

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
    { data: activeInvitation },
    { data: publicAnnouncements },
    { data: gallerySections },
    { data: galleryMedia },
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
    supabase
      .from('event_invitations')
      .select('*')
      .eq('occasion_id', ev.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .maybeSingle(),
    supabase
      .from('event_announcements')
      .select('*')
      .eq('occasion_id', ev.id)
      .eq('visibility', 'public')
      .eq('share_to_public_page', true)
      .lte('publish_at', new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('pinned', { ascending: false })
      .order('publish_at', { ascending: false })
      .limit(6),
    supabase
      .from('event_gallery_sections')
      .select('*')
      .eq('occasion_id', ev.id)
      .eq('is_active', true)
      .eq('visibility', 'public')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('event_gallery_media')
      .select('*')
      .eq('occasion_id', ev.id)
      .eq('visibility', 'public')
      .eq('moderation_status', 'approved')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
  ])
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/e/${slug}`
  const shareTarget = publicUrl || `/e/${slug}`
  const invitationCopy = generateInvitationCopy({
    occasionType,
    eventName: activeInvitation?.title ?? ev.title,
    dateTime: ev.event_date,
    location: activeInvitation?.venue_address ?? ev.location,
    hostNames: activeInvitation?.host_names,
    rsvpLink: shareTarget,
    contributionLink: `${shareTarget}#pledge`,
    templateId: activeInvitation?.template_id,
  }).whatsappCopy
  const whatsappHref = buildWhatsappShareUrl(invitationCopy)

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

      {activeInvitation && (
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Invitation</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">{activeInvitation.title}</h2>
            {activeInvitation.body && <p className="mt-2 text-sm leading-6 text-foreground/60">{activeInvitation.body}</p>}
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg border border-sage/30 bg-sage/5 px-4 py-2 text-sm font-semibold text-sage hover:bg-sage/10">
              Share invitation
            </a>
          </div>
          <InvitationPreview
            title={activeInvitation.title}
            subtitle={activeInvitation.subtitle}
            body={activeInvitation.body}
            hostNames={activeInvitation.host_names}
            dateTime={ev.event_date ? new Date(ev.event_date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : null}
            venueName={activeInvitation.venue_name}
            venueAddress={activeInvitation.venue_address}
            dressCode={activeInvitation.dress_code}
            rsvpNote={activeInvitation.rsvp_note}
            supportNote={activeInvitation.support_note}
            templateId={activeInvitation.template_id}
            fileUrl={activeInvitation.file_url}
            previewUrl={activeInvitation.preview_url}
          />
        </section>
      )}

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

      {!!publicAnnouncements?.length && (
        <section className="rounded-xl border border-white/5 p-4">
          <h2 className="font-display text-2xl font-semibold">Public announcements</h2>
          <div className="mt-4 grid gap-3">
            {publicAnnouncements.map(item => (
              <article key={item.id} className={`rounded-lg border p-3 ${item.priority === 'urgent' ? 'border-red-400/30 bg-red-500/10' : item.pinned ? 'border-pulse/30 bg-pulse/10' : 'border-white/5'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  {item.pinned && <span className="rounded-full bg-pulse/15 px-2 py-0.5 text-[11px] text-pulse">pinned</span>}
                  {item.priority === 'urgent' && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-200">urgent</span>}
                </div>
                <p className="mt-1 text-sm leading-6 text-foreground/60">{item.body}</p>
                {item.share_to_whatsapp_ready && (
                  <a href={buildAnnouncementWhatsappUrl({ eventName: ev.title, title: item.title, body: item.body, link: shareTarget })} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg border border-sage/20 px-3 py-1.5 text-xs text-sage hover:bg-sage/10">
                    Share update
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

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

      <GalleryPublic
        eventName={ev.title}
        eventUrl={shareTarget}
        occasionType={occasionType}
        sections={(gallerySections ?? []) as GallerySectionRecord[]}
        media={(galleryMedia ?? []) as GalleryMediaRecord[]}
      />

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1fr]">
        <div>
          <h2 className="font-display text-2xl font-semibold">{respectful ? 'Share a memory or tribute' : 'Upload your memories'}</h2>
          <p className="mt-1 text-sm text-foreground/60">
            {respectful
              ? 'Guest media is reviewed before it appears publicly.'
              : 'Add photos or short videos from the celebration. Guest uploads are reviewed before appearing publicly.'}
          </p>
        </div>
        <GalleryUploadForm
          eventId={ev.id}
          sections={(gallerySections ?? []) as GallerySectionRecord[]}
          guestMode
          respectful={respectful}
        />
      </section>

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
                {(contributions as PublicContribution[]).map(contribution => (
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
