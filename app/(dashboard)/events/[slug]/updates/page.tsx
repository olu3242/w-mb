import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnnouncementForm } from '@/components/ops/announcement-form'
import { EventAnnouncementForm } from '@/components/announcements/event-announcement-form'
import { buildAnnouncementWhatsappUrl } from '@/lib/announcements/templates'

export default async function UpdatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: event } = await supabase.from('events').select('id, title').eq('slug', slug).single()
  if (!event) notFound()

  const [{ data: announcements }, { data: eventAnnouncements }, { data: updates }, { data: notifications }] = await Promise.all([
    supabase.from('announcements').select('*').eq('occasion_id', event.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('event_announcements').select('*').eq('occasion_id', event.id).order('pinned', { ascending: false }).order('publish_at', { ascending: false }).limit(12),
    supabase.from('event_updates').select('*').eq('occasion_id', event.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('notifications').select('*').eq('occasion_id', event.id).order('created_at', { ascending: false }).limit(10),
  ])
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/e/${slug}` || `/e/${slug}`

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
      <div>
        <h2 className="font-display text-xl font-bold">Public service announcements</h2>
        <p className="mt-1 text-sm text-foreground/50">Create public, guest-only, or committee-only updates with WhatsApp-ready copy.</p>
        <div className="mt-5">
          <EventAnnouncementForm eventId={event.id} eventName={event.title} publicUrl={publicUrl} />
        </div>
        <h2 className="mt-8 font-display text-xl font-bold">Legacy announcements</h2>
        <p className="mt-1 text-sm text-foreground/50">Older in-app announcements remain available for existing workflows.</p>
        <div className="mt-5">
          <AnnouncementForm eventId={event.id} />
        </div>
      </div>
      <div className="grid gap-4">
        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-semibold">Recent PSAs</h3>
          <div className="mt-3 grid gap-3">
            {(eventAnnouncements ?? []).map(item => (
              <div key={item.id} className={`rounded-lg border p-3 ${item.priority === 'urgent' ? 'border-red-400/30 bg-red-500/10' : 'border-white/5'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  {item.pinned && <span className="rounded-full bg-pulse/15 px-2 py-0.5 text-[11px] text-pulse">pinned</span>}
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-foreground/50">{item.visibility.replace(/_/g, ' ')}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-foreground/50">{item.priority}</span>
                </div>
                <p className="mt-1 text-sm text-foreground/60">{item.body}</p>
                {item.share_to_whatsapp_ready && (
                  <a href={buildAnnouncementWhatsappUrl({ eventName: event.title, title: item.title, body: item.body, link: publicUrl })} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg border border-sage/20 px-3 py-1.5 text-xs text-sage hover:bg-sage/10">
                    Share on WhatsApp
                  </a>
                )}
              </div>
            ))}
            {!eventAnnouncements?.length && <p className="text-sm text-foreground/40">No public service announcements yet.</p>}
          </div>
        </section>
        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-semibold">Recent announcements</h3>
          <div className="mt-3 grid gap-3">
            {(announcements ?? []).map(item => (
              <div key={item.id} className="rounded-lg border border-white/5 p-3">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-foreground/60">{item.body}</p>
                <p className="mt-2 text-xs text-foreground/40">{item.audience} · {item.channel.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-semibold">Public updates</h3>
          <div className="mt-3 grid gap-3">
            {(updates ?? []).map(item => (
              <div key={item.id} className="rounded-lg border border-white/5 p-3">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-foreground/60">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-semibold">Notification queue</h3>
          <p className="mt-2 text-sm text-foreground/50">{notifications?.length ?? 0} notification records queued or sent.</p>
        </section>
      </div>
    </div>
  )
}
