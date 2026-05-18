import { getGallerySectionPresets, getGalleryShareCopy, getGalleryWhatsappUrl } from '@/lib/gallery/templates'

export type GallerySectionRecord = {
  id: string
  title: string
  description?: string | null
  section_type: string
  visibility: string
}

export type GalleryMediaRecord = {
  id: string
  gallery_section_id?: string | null
  media_type: 'image' | 'video' | string
  file_url: string
  thumbnail_url?: string | null
  caption?: string | null
  uploader_name?: string | null
  moderation_status?: string
  visibility?: string
}

export function GalleryPublic({
  eventName,
  eventUrl,
  occasionType,
  sections,
  media,
}: {
  eventName: string
  eventUrl: string
  occasionType?: string | null
  sections: GallerySectionRecord[]
  media: GalleryMediaRecord[]
}) {
  const presets = getGallerySectionPresets(occasionType)
  const sectionList = sections.length
    ? sections
    : presets.map((preset, index) => ({
        id: preset.sectionType,
        title: preset.title,
        description: preset.description,
        section_type: preset.sectionType,
        visibility: 'public',
        sort_order: index,
      }))

  const shareCopy = getGalleryShareCopy({ eventName, link: `${eventUrl}#gallery`, occasionType })

  return (
    <section id="gallery" className="rounded-xl border border-white/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Event gallery</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">
            {occasionType === 'funeral_memorial' ? 'Memories & Tributes' : 'Celebration memories'}
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            {media.length ? 'Browse approved public photos and videos from the occasion.' : 'No public gallery media has been added yet.'}
          </p>
        </div>
        <a href={getGalleryWhatsappUrl(shareCopy)} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-sage/20 px-3 py-2 text-sm text-sage hover:bg-sage/10">
          Share gallery
        </a>
      </div>

      <div className="mt-5 grid gap-6">
        {sectionList.map(section => {
          const items = media.filter(item => item.gallery_section_id === section.id)
          return (
            <div key={section.id} className="grid gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold">{section.title}</h3>
                {section.description && <p className="mt-1 text-sm text-foreground/50">{section.description}</p>}
              </div>
              {items.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(item => (
                    <GalleryMediaTile key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-foreground/40">
                  {occasionType === 'funeral_memorial' ? 'No public memories in this section yet.' : 'No public photos or videos in this section yet.'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function GalleryMediaTile({ item }: { item: GalleryMediaRecord }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]">
      {item.media_type === 'video' ? (
        <video controls preload="metadata" className="aspect-video w-full bg-black object-cover">
          <source src={item.file_url} />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail_url || item.file_url} alt={item.caption || 'Event gallery media'} className="aspect-[4/3] w-full object-cover" />
      )}
      {(item.caption || item.uploader_name) && (
        <figcaption className="p-3 text-sm text-foreground/60">
          {item.caption && <p>{item.caption}</p>}
          {item.uploader_name && <p className="mt-1 text-xs text-foreground/40">By {item.uploader_name}</p>}
        </figcaption>
      )}
    </figure>
  )
}
