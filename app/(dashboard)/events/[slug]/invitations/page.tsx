import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { InvitationStudio } from '@/components/invitations/invitation-studio'

export default async function EventInvitationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { slug } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, event_date, location, occasion_type, owner_id')
    .eq('slug', slug)
    .single()

  if (!event) notFound()

  const { data: activeInvitation } = await supabase
    .from('event_invitations')
    .select('*')
    .eq('occasion_id', event.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle()

  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/e/${slug}` || `/e/${slug}`

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-foreground/50">Invitation Studio</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{event.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/60">
            Import an existing invitation, design a simple card, or generate Owambe-ready copy for sharing.
          </p>
        </div>
        <Link href={`/events/${slug}`} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-foreground/60 hover:border-white/20">
          Back to dashboard
        </Link>
      </div>

      <InvitationStudio event={event} activeInvitation={activeInvitation} publicUrl={publicUrl} initialMode={query.mode} />
    </div>
  )
}
