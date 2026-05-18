'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { GalleryMediaTile, type GalleryMediaRecord, type GallerySectionRecord } from '@/components/gallery/gallery-public'
import { GalleryUploadForm } from '@/components/gallery/gallery-upload-form'
import { GALLERY_SECTION_TYPES, GALLERY_VISIBILITIES, getGalleryShareCopy, getGalleryWhatsappUrl } from '@/lib/gallery/templates'

export function GalleryManager({
  eventId,
  eventName,
  eventUrl,
  occasionType,
  initialSections,
  initialMedia,
}: {
  eventId: string
  eventName: string
  eventUrl: string
  occasionType?: string | null
  initialSections: GallerySectionRecord[]
  initialMedia: GalleryMediaRecord[]
}) {
  const [sections, setSections] = useState(initialSections)
  const [media, setMedia] = useState(initialMedia)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sectionType, setSectionType] = useState('custom')
  const [visibility, setVisibility] = useState('public')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const respectful = occasionType === 'funeral_memorial'

  async function seedSections() {
    setError('')
    const response = await fetch(`/api/events/${eventId}/gallery/sections`, { method: 'PUT' })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? 'Unable to create sections')
      return
    }
    setSections(data)
    setMessage('Default gallery sections created.')
  }

  async function createSection(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const response = await fetch(`/api/events/${eventId}/gallery/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, section_type: sectionType, visibility }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? 'Unable to create section')
      return
    }
    setSections(prev => [...prev, data])
    setTitle('')
    setDescription('')
    setMessage('Gallery section created.')
  }

  async function updateMedia(mediaId: string, patch: Partial<GalleryMediaRecord>) {
    const response = await fetch(`/api/events/${eventId}/gallery/media/${mediaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? 'Unable to update media')
      return
    }
    setMedia(prev => prev.map(item => item.id === mediaId ? data : item))
  }

  const shareCopy = getGalleryShareCopy({ eventName, link: `${eventUrl}#gallery`, occasionType })
  const pending = media.filter(item => item.moderation_status === 'pending')

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid gap-4">
        <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Event Gallery</p>
          <h2 className="mt-2 font-display text-2xl font-bold">{respectful ? 'Memories & Tributes' : 'Party lifecycle media'}</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/60">
            Manage public, guest-only, committee, and private sections across the event lifecycle.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={seedSections}>Create default sections</Button>
            <a href={getGalleryWhatsappUrl(shareCopy)} target="_blank" rel="noreferrer" className="rounded-lg border border-sage/20 px-3 py-1.5 text-xs text-sage hover:bg-sage/10">
              Share gallery
            </a>
          </div>
          <div className="mt-4 rounded-lg border border-white/5 bg-black/10 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">WhatsApp copy</p>
            <p className="mt-2 text-sm leading-6 text-foreground/70">{shareCopy}</p>
          </div>
        </section>

        <form onSubmit={createSection} className="grid gap-3 rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-semibold">Create custom section</h3>
          <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
          <Textarea label="Description" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Type" value={sectionType} onChange={e => setSectionType(e.target.value)} options={GALLERY_SECTION_TYPES.map(type => ({ value: type, label: type.replace(/_/g, ' ') }))} />
            <Select label="Visibility" value={visibility} onChange={e => setVisibility(e.target.value)} options={GALLERY_VISIBILITIES.map(type => ({ value: type, label: type.replace(/_/g, ' ') }))} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-sage">{message}</p>}
          <Button type="submit">Create section</Button>
        </form>

        <GalleryUploadForm eventId={eventId} sections={sections} respectful={respectful} />
      </div>

      <div className="grid gap-4">
        {!!pending.length && (
          <section className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
            <h3 className="font-display text-lg font-semibold">Pending guest uploads</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {pending.map(item => (
                <div key={item.id} className="grid gap-2">
                  <GalleryMediaTile item={item} />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => updateMedia(item.id, { moderation_status: 'approved' })}>Approve</Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => updateMedia(item.id, { moderation_status: 'rejected' })}>Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-white/5 p-4">
          <h3 className="font-display text-lg font-semibold">Sections</h3>
          <div className="mt-3 grid gap-3">
            {sections.map(section => {
              const items = media.filter(item => item.gallery_section_id === section.id)
              return (
                <article key={section.id} className="rounded-lg border border-white/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{section.title}</p>
                      <p className="mt-1 text-xs text-foreground/40">{section.section_type.replace(/_/g, ' ')} · {section.visibility.replace(/_/g, ' ')} · {items.length} media</p>
                    </div>
                  </div>
                  {section.description && <p className="mt-2 text-sm text-foreground/60">{section.description}</p>}
                  {!!items.length && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map(item => <GalleryMediaTile key={item.id} item={item} />)}
                    </div>
                  )}
                </article>
              )
            })}
            {!sections.length && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-foreground/40">
                Create default sections to begin organizing media.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
