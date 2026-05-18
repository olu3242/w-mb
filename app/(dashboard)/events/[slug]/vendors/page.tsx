import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { addVendor, deleteVendor } from '@/app/actions/vendors'
import { VendorStatusSelect } from '@/components/events/vendor-status-select'
import { VendorInquiryForm } from '@/components/vendors/vendor-inquiry-form'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { getPlanningTemplate } from '@/lib/occasion/planning-templates'
import type { OccasionType } from '@/lib/occasion/occasion-types'

export default async function VendorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ category?: string }>
}) {
  const { slug } = await params
  const { category } = await searchParams
  const supabase = await createClient()
  const { data: event } = await supabase.from('events').select('id, event_date, occasion_type').eq('slug', slug).single()
  if (!event) notFound()

  const template = getPlanningTemplate(event.occasion_type as OccasionType)
  const selectedCategory = category ?? template.vendorNeeds[0]
  const [
    { data: vendors },
    { data: marketplace },
    { data: inquiries },
  ] = await Promise.all([
    supabase.from('vendors').select('*').eq('event_id', event.id).order('created_at'),
    supabase
      .from('vendor_directory')
      .select('*')
      .ilike('category', `%${selectedCategory}%`)
      .order('is_verified', { ascending: false })
      .order('rating', { ascending: false }),
    supabase
      .from('vendor_inquiries')
      .select('id, status, message, created_at, vendor_directory(name, category)')
      .eq('occasion_id', event.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-xl font-bold">Vendor Hub</h2>
        <p className="mt-1 text-sm text-foreground/50">Browse suggested vendors and send lightweight quote requests. Use the category pills to narrow your search.</p>
      </div>

      <section className="rounded-xl border border-white/5 p-4">
        <h3 className="font-display text-lg font-semibold">Suggested vendor categories</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {template.vendorNeeds.map(vendorCategory => (
            <a
              key={vendorCategory}
              href={`/events/${slug}/vendors?category=${encodeURIComponent(vendorCategory)}`}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedCategory === vendorCategory
                  ? 'border-pulse/30 bg-pulse/10 text-pulse'
                  : 'border-white/10 text-foreground/60 hover:border-white/20'
              }`}
            >
              {vendorCategory}
            </a>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {(marketplace ?? []).map(vendor => (
            <div key={vendor.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{vendor.name}</p>
                  <p className="mt-1 text-xs text-foreground/50">{vendor.category} · {[vendor.city, vendor.country].filter(Boolean).join(', ')}</p>
                </div>
                {vendor.is_verified && <span className="rounded-full bg-sage/10 px-2 py-1 text-[11px] text-sage">Verified</span>}
              </div>
              {vendor.description && <p className="mt-3 text-sm leading-5 text-foreground/60">{vendor.description}</p>}
              {vendor.rating != null && <p className="mt-2 text-xs text-foreground/40">Rating {vendor.rating}/5</p>}
              <VendorInquiryForm eventId={event.id} vendorId={vendor.id} eventDate={event.event_date} />
            </div>
          ))}
          {!marketplace?.length && (
            <div className="rounded-xl border border-white/5 p-6 text-sm text-foreground/40">
              No suggested vendors in this category yet. Add a vendor manually or try a different category to keep the plan moving.
            </div>
          )}
        </div>
      </section>

      {!!inquiries?.length && (
        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-semibold">Quote requests</h3>
          <div className="mt-3 grid gap-3">
            {inquiries.map(inquiry => (
              <div key={inquiry.id} className="rounded-lg border border-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{getVendorDirectoryName(inquiry.vendor_directory)}</p>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{inquiry.status}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/50">{inquiry.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <form action={addVendor} className="flex flex-wrap gap-3 rounded-xl border border-white/5 p-4">
        <input type="hidden" name="event_id" value={event.id} />
        <input type="hidden" name="slug" value={slug} />
        <input name="name" placeholder="Vendor name *" required className="flex-1 min-w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-pulse/60" />
        <input name="category" placeholder="Category *" required className="w-36 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-pulse/60" />
        <input name="contact" placeholder="Contact" className="w-44 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-pulse/60" />
        <input name="cost" type="number" min="0" step="0.01" placeholder="Cost ($)" className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-pulse/60" />
        <Button type="submit" size="sm">Add vendor</Button>
      </form>

      {!vendors?.length ? (
        <div className="rounded-xl border border-white/5 p-12 text-center text-foreground/40">No vendors yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {vendors.map(v => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-white/5 p-4">
              <div>
                <p className="font-medium">{v.name}</p>
                <p className="text-sm text-foreground/50">{v.category}</p>
                {v.contact && <p className="text-xs text-foreground/40">{v.contact}</p>}
              </div>
              <div className="flex items-center gap-4">
                {v.cost != null && <span className="text-sm text-foreground/60">{formatCurrency(v.cost)}</span>}
                <VendorStatusSelect id={v.id} status={v.status} slug={slug} />
                <form action={deleteVendor.bind(null, v.id, slug)}>
                  <button type="submit" className="text-xs text-foreground/30 hover:text-red-400 transition-colors">remove</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getVendorDirectoryName(value: unknown) {
  const record = Array.isArray(value) ? value[0] : value
  return typeof record === 'object' && record !== null && 'name' in record
    ? String((record as { name?: unknown }).name ?? 'Vendor')
    : 'Vendor'
}
