import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GalleryManager } from '@/components/gallery/gallery-manager'
import type { GalleryMediaRecord, GallerySectionRecord } from '@/components/gallery/gallery-public'

export default async function EventGalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, occasion_type')
    .eq('slug', slug)
    .single()

  if (!event) notFound()

  const [{ data: sections }, { data: media }] = await Promise.all([
    supabase
      .from('event_gallery_sections')
      .select('*')
      .eq('occasion_id', event.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('event_gallery_media')
      .select('*')
      .eq('occasion_id', event.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/e/${slug}` || `/e/${slug}`

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-foreground/50">Event Gallery</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{event.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/60">
            Organize media across pre-event, main event, post-event, and custom sections.
          </p>
        </div>
        <Link href={`/events/${slug}`} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-foreground/60 hover:border-white/20">
          Back to dashboard
        </Link>
      </div>

      <GalleryManager
        eventId={event.id}
        eventName={event.title}
        eventUrl={publicUrl}
        occasionType={event.occasion_type}
        initialSections={(sections ?? []) as GallerySectionRecord[]}
        initialMedia={(media ?? []) as GalleryMediaRecord[]}
      />
    </div>
  )
}
