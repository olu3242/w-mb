import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommitteeInviteForm } from '@/components/ops/committee-invite-form'

export default async function CommitteePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: event } = await supabase.from('events').select('id').eq('slug', slug).single()
  if (!event) notFound()

  const { data: members } = await supabase
    .from('committee_members')
    .select('*')
    .eq('occasion_id', event.id)
    .order('created_at', { ascending: false })

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1fr]">
      <div>
        <h2 className="font-display text-xl font-bold">Committee</h2>
        <p className="mt-1 text-sm text-foreground/50">Invite role leads and coordinate shared planning.</p>
        <div className="mt-5">
          <CommitteeInviteForm eventId={event.id} />
        </div>
      </div>
      <section className="rounded-xl border border-white/5 p-4">
        <h3 className="font-display text-lg font-semibold">Members</h3>
        <div className="mt-4 grid gap-3">
          {(members ?? []).map(member => (
            <div key={member.id} className="rounded-lg border border-white/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{member.name ?? member.email}</p>
                <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{member.status}</span>
              </div>
              <p className="mt-1 text-sm text-foreground/50">{member.role.replace(/_/g, ' ')}</p>
              {member.email && <p className="mt-1 text-xs text-foreground/40">{member.email}</p>}
            </div>
          ))}
          {!members?.length && <p className="text-sm text-foreground/40">No committee members invited yet.</p>}
        </div>
      </section>
    </div>
  )
}
