import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GuestInviteForm } from '@/components/ops/guest-invite-form'

export default async function GuestsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: event } = await supabase.from('events').select('id, title').eq('slug', slug).single()
  if (!event) notFound()

  const { data: guests } = await supabase
    .from('event_guests')
    .select('*')
    .eq('occasion_id', event.id)
    .order('created_at', { ascending: false })

  const accepted = guests?.filter(guest => guest.status === 'accepted').reduce((sum, guest) => sum + guest.guest_count, 0) ?? 0
  const maybe = guests?.filter(guest => guest.status === 'maybe').length ?? 0
  const declined = guests?.filter(guest => guest.status === 'declined').length ?? 0

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
      <div>
        <h2 className="font-display text-xl font-bold">Guests & RSVP</h2>
        <p className="mt-1 text-sm text-foreground/50">Create RSVP links and share them by WhatsApp or email so guests can respond quickly.</p>
        <div className="mt-5">
          <GuestInviteForm eventId={event.id} />
        </div>
      </div>
      <section className="rounded-xl border border-white/5 p-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-foreground/40">Accepted</p><p className="text-xl font-bold text-sage">{accepted}</p></div>
          <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-foreground/40">Maybe</p><p className="text-xl font-bold">{maybe}</p></div>
          <div className="rounded-lg bg-white/[0.03] p-3"><p className="text-foreground/40">Declined</p><p className="text-xl font-bold">{declined}</p></div>
        </div>
        <div className="mt-4 grid gap-3">
          {(guests ?? []).map(guest => {
            const link = `/rsvp/${guest.invitation_token}`
            const whatsapp = `https://wa.me/?text=${encodeURIComponent(`You're invited to ${event.title}. RSVP here: ${link}`)}`
            return (
              <div key={guest.id} className="rounded-lg border border-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{guest.name}</p>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{guest.status}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/40">Party size {guest.guest_count}</p>
                <div className="mt-2 flex gap-3 text-xs">
                  <a href={link} className="text-pulse">RSVP link</a>
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="text-sage">WhatsApp</a>
                </div>
              </div>
            )
          })}
          {!guests?.length && <p className="text-sm text-foreground/40">No guests invited yet.</p>}
        </div>
      </section>
    </div>
  )
}
