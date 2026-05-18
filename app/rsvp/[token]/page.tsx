import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { RsvpForm } from '@/components/ops/rsvp-form'
import { InvitationPreview } from '@/components/invitations/invitation-preview'

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: guest } = await admin
    .from('event_guests')
    .select('id, occasion_id, name, guest_count, invitation_token')
    .eq('invitation_token', token)
    .single()

  if (!guest) notFound()
  const { data: event } = await admin
    .from('events')
    .select('id, title, event_date, location, is_public')
    .eq('id', guest.occasion_id)
    .single()
  if (!event?.is_public) notFound()

  const { data: activeInvitation } = await admin
    .from('event_invitations')
    .select('*')
    .eq('occasion_id', event.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle()

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      {activeInvitation && (
        <div className="mb-6">
          <InvitationPreview
            title={activeInvitation.title}
            subtitle={activeInvitation.subtitle}
            body={activeInvitation.body}
            hostNames={activeInvitation.host_names}
            dateTime={event.event_date ? new Date(event.event_date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : null}
            venueName={activeInvitation.venue_name}
            venueAddress={activeInvitation.venue_address}
            dressCode={activeInvitation.dress_code}
            rsvpNote={activeInvitation.rsvp_note}
            supportNote={activeInvitation.support_note}
            templateId={activeInvitation.template_id}
            fileUrl={activeInvitation.file_url}
            previewUrl={activeInvitation.preview_url}
          />
        </div>
      )}
      <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
        <p className="text-sm text-foreground/40">RSVP for</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{event.title}</h1>
        <p className="mt-3 text-sm text-foreground/60">Hello {guest.name}, please let the organizer know if you can attend.</p>
        {event.event_date && <p className="mt-2 text-sm text-foreground/50">{new Date(event.event_date).toLocaleDateString('en-US', { dateStyle: 'full' })}</p>}
        {event.location && <p className="text-sm text-foreground/40">{event.location}</p>}
      </div>
      <RsvpForm token={token} defaultCount={guest.guest_count} />
    </main>
  )
}
