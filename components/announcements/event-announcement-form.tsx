'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ANNOUNCEMENT_TYPES, generateAnnouncementBody, generateAnnouncementShareCopy, type AnnouncementType } from '@/lib/announcements/templates'

type EventAnnouncementFormProps = {
  eventId: string
  eventName: string
  publicUrl: string
}

export function EventAnnouncementForm({ eventId, eventName, publicUrl }: EventAnnouncementFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [announcementType, setAnnouncementType] = useState('custom')
  const [priority, setPriority] = useState('normal')
  const [visibility, setVisibility] = useState('public')
  const [pinned, setPinned] = useState(false)
  const [shareToPublicPage, setShareToPublicPage] = useState(true)
  const [shareToWhatsappReady, setShareToWhatsappReady] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const shareCopy = generateAnnouncementShareCopy({ eventName, title: title || 'Event update', body: body || generateAnnouncementBody(announcementType as AnnouncementType, eventName), link: publicUrl })

  function applyTemplate(type: string) {
    setAnnouncementType(type)
    if (!title) setTitle(type.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' '))
    setBody(generateAnnouncementBody(type as AnnouncementType, eventName))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    const response = await fetch(`/api/events/${eventId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        announcement_type: announcementType,
        priority,
        visibility,
        pinned,
        share_to_public_page: shareToPublicPage,
        share_to_whatsapp_ready: shareToWhatsappReady,
      }),
    })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to create announcement')
      return
    }
    setMessage('Announcement published.')
    setTitle('')
    setBody('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <Select
        label="Announcement type"
        value={announcementType}
        onChange={e => applyTemplate(e.target.value)}
        options={ANNOUNCEMENT_TYPES.map(type => ({ value: type, label: type.replace(/_/g, ' ') }))}
      />
      <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
      <Textarea label="Body" value={body} onChange={e => setBody(e.target.value)} rows={5} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Priority" value={priority} onChange={e => setPriority(e.target.value)} options={['normal', 'important', 'urgent'].map(value => ({ value, label: value }))} />
        <Select label="Visibility" value={visibility} onChange={e => setVisibility(e.target.value)} options={['public', 'guests_only', 'committee_only'].map(value => ({ value, label: value.replace(/_/g, ' ') }))} />
      </div>
      <div className="grid gap-2 text-sm text-foreground/70">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="accent-pulse" />
          Pin announcement
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={shareToPublicPage} onChange={e => setShareToPublicPage(e.target.checked)} className="accent-pulse" />
          Share to public page
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={shareToWhatsappReady} onChange={e => setShareToWhatsappReady(e.target.checked)} className="accent-pulse" />
          Generate WhatsApp-ready copy
        </label>
      </div>
      <div className="rounded-lg border border-white/5 bg-black/10 p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">WhatsApp copy</p>
        <p className="mt-2 text-sm leading-6 text-foreground/70">{shareCopy}</p>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" loading={saving}>Create announcement</Button>
    </form>
  )
}
