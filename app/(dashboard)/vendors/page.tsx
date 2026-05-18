import { createClient } from '@/lib/supabase/server'
import { VendorCrmForm } from '@/components/vendors/vendor-crm-form'
import { formatCurrency, toBaseCurrency } from '@/lib/currency'

export default async function VendorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: vendors } = await supabase
    .from('vendor_directory')
    .select('*')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })

  const vendorIds = vendors?.map(vendor => vendor.id) ?? []
  const [{ data: inquiries }, { data: leads }, { data: plans }, { data: packages }] = await Promise.all([
    vendorIds.length
      ? supabase.from('vendor_inquiries').select('*, events(title, slug)').in('vendor_id', vendorIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    vendorIds.length
      ? supabase.from('vendor_leads').select('*').in('vendor_id', vendorIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('vendor_subscription_plans').select('*').order('monthly_price'),
    vendorIds.length
      ? supabase.from('vendor_service_packages').select('*').in('vendor_id', vendorIds).eq('is_active', true)
      : Promise.resolve({ data: [] }),
  ])

  const inquiryCount = inquiries?.length ?? 0
  const wonLeads = leads?.filter(lead => lead.stage === 'won').length ?? 0
  const conversionRate = inquiryCount ? Math.round((wonLeads / inquiryCount) * 100) : 0
  const openPipeline = (leads ?? [])
    .filter(lead => !['won', 'lost'].includes(lead.stage))
    .reduce((sum, lead) => sum + toBaseCurrency(Number(lead.estimated_value ?? 0), 'USD', 'USD'), 0)
  const recentlyTouchedLeads = leads?.filter(lead => Boolean(lead.last_contacted_at)).length ?? 0
  const firstVendor = vendors?.[0]
  const firstInquiry = inquiries?.[0]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Vendor CRM</h1>
        <p className="mt-1 text-sm text-foreground/50">Inquiry inbox, lead tracking, packages, and subscription readiness.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric label="Listings" value={vendors?.length ?? 0} />
        <Metric label="Inquiries" value={inquiryCount} />
        <Metric label="Won leads" value={wonLeads} />
        <Metric label="Conversion" value={`${conversionRate}%`} />
      </div>

      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Vendor analytics</p>
        <h2 className="mt-2 font-display text-lg font-semibold">Marketplace operating signals</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Open pipeline" value={formatCurrency(openPipeline, 'USD')} />
          <Metric label="Touched leads" value={recentlyTouchedLeads} />
          <Metric label="Packages" value={packages?.length ?? 0} />
          <Metric label="Trust score" value={firstVendor?.trust_score ?? 'Pending'} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-xl border border-white/5 p-4">
          <h2 className="font-display text-lg font-semibold">Inquiry inbox</h2>
          <div className="mt-4 grid gap-3">
            {(inquiries ?? []).map(inquiry => {
              const event = Array.isArray(inquiry.events) ? inquiry.events[0] : inquiry.events
              return (
                <div key={inquiry.id} className="rounded-lg border border-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{event?.title ?? 'Event inquiry'}</p>
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-foreground/50">{inquiry.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60">{inquiry.message}</p>
                </div>
              )
            })}
            {!inquiries?.length && <p className="text-sm text-foreground/40">No vendor inquiries yet.</p>}
          </div>
        </section>

        <div className="grid gap-4">
          {firstVendor ? (
            <VendorCrmForm vendorId={firstVendor.id} inquiryId={firstInquiry?.id} />
          ) : (
            <div className="rounded-xl border border-white/5 p-4 text-sm text-foreground/50">Claim or create a vendor listing to start tracking leads.</div>
          )}
          <section className="rounded-xl border border-white/5 p-4">
            <h2 className="font-display text-lg font-semibold">Subscription foundation</h2>
            <div className="mt-3 grid gap-2">
              {(plans ?? []).map(plan => (
                <div key={plan.id} className="rounded-lg bg-white/[0.03] p-3 text-sm">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-foreground/50">${(Number(plan.monthly_price) / 100).toFixed(0)}/mo · {plan.tier}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/5 p-4">
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
