'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { GallerySectionRecord } from '@/components/gallery/gallery-public'

export function GalleryUploadForm({
  eventId,
  sections,
  guestMode = false,
  respectful = false,
}: {
  eventId: string
  sections: GallerySectionRecord[]
  guestMode?: boolean
  respectful?: boolean
}) {
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '')
  const [uploaderName, setUploaderName] = useState('')
  const [caption, setCaption] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    setMessage('')
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`/api/events/${eventId}/gallery/upload`, { method: 'POST', body: formData })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Upload failed')
      return
    }
    setFileUrl(data.url)
    setMediaType(data.mediaType)
    setMessage('Media uploaded. Add details and save it to the gallery.')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const response = await fetch(`/api/events/${eventId}/gallery/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gallery_section_id: sectionId || null,
        uploader_name: uploaderName || null,
        media_type: mediaType,
        file_url: fileUrl,
        thumbnail_url: mediaType === 'image' ? fileUrl : null,
        caption,
        visibility: 'public',
        moderation_status: guestMode ? 'pending' : 'approved',
        guest_upload: guestMode,
      }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to save media')
      return
    }
    setMessage(guestMode ? 'Upload received for review.' : 'Media added to gallery.')
    setCaption('')
    setFileUrl('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 p-4">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-6 text-sm text-foreground/60 hover:border-white/30">
        <Upload className="h-4 w-4" />
        {loading ? 'Uploading...' : respectful ? 'Upload memory or tribute media' : 'Upload photo or video'}
        <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={uploadFile} className="hidden" />
      </label>
      <p className="text-xs text-foreground/40">Images up to 8 MB. Videos up to 50 MB.</p>
      <Select
        label="Gallery section"
        value={sectionId}
        onChange={e => setSectionId(e.target.value)}
        options={[{ value: '', label: 'Unassigned' }, ...sections.map(section => ({ value: section.id, label: section.title }))]}
      />
      {guestMode && <Input label="Your name" value={uploaderName} onChange={e => setUploaderName(e.target.value)} />}
      <Textarea label="Caption" rows={3} value={caption} onChange={e => setCaption(e.target.value)} />
      {fileUrl && <p className="rounded-lg border border-sage/20 bg-sage/5 px-3 py-2 text-xs text-sage">Media ready to save.</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" loading={loading} disabled={!fileUrl}>
        {guestMode ? 'Submit for review' : 'Add to gallery'}
      </Button>
    </form>
  )
}
