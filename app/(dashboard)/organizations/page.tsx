import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function OrganizationsPage() {
  const supabase = await createClient()
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Organizations</h1>
          <p className="mt-1 text-sm text-foreground/50">Community, church, family, and association workspaces.</p>
        </div>
        <Link href="/organizations/new" className="rounded-lg bg-pulse px-4 py-2 text-sm font-semibold text-void">New organization</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(organizations ?? []).map(org => (
          <Link key={org.id} href={`/organizations/${org.slug}`} className="rounded-xl border border-white/5 p-4 hover:border-white/10">
            <p className="font-semibold">{org.name}</p>
            <p className="mt-1 text-sm text-foreground/50">{org.organization_type.replace(/_/g, ' ')}</p>
            {org.description && <p className="mt-3 line-clamp-2 text-sm text-foreground/60">{org.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
