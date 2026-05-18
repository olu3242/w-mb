import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnnouncementForm } from '@/components/ops/announcement-form'

export default async function UpdatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: event } = await supabase.from('events').select('id').eq('slug', slug).single()
  if (!event) notFound()

  const [{ data: announcements }, { data: updates }, { data: notifications }] = await Promise.all([
    supabase.from('announcements').select('*').eq('occasion_id', event.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('event_updates').select('*').eq('occasion_id', event.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('notifications').select('*').eq('occasion_id', event.id).order('created_at', { ascending: false }).limit(10),
  ])

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
      <div>
        <h2 className="font-display text-xl font-bold">Announcements</h2>
        <p className="mt-1 text-sm text-foreground/50">Post updates and prepare WhatsApp-ready communication.</p>
        <div className="mt-5">
          <AnnouncementForm eventId={event.id} />
        </div>
      </div>
      <div className="grid gap-4">
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
