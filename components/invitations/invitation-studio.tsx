'use client'

import { useMemo, useState } from 'react'
import { Upload, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { InvitationPreview } from '@/components/invitations/invitation-preview'
import { generateInvitationCopy, buildWhatsappShareUrl } from '@/lib/invitations/generator'
import { getTemplatesForOccasion, INVITATION_TEMPLATES } from '@/lib/invitations/templates'

type InvitationRecord = {
  source_type?: string | null
  template_id?: string | null
  title?: string | null
  subtitle?: string | null
  body?: string | null
  host_names?: string | null
  venue_name?: string | null
  venue_address?: string | null
  dress_code?: string | null
  rsvp_note?: string | null
  support_note?: string | null
  file_url?: string | null
}

type InvitationStudioProps = {
  event: {
    id: string
    title: string
    slug: string
    event_date?: string | null
    location?: string | null
    occasion_type?: string | null
    owner_id?: string
  }
  activeInvitation?: InvitationRecord | null
  publicUrl: string
  initialMode?: string | null
}

const MODE_OPTIONS = [
  { value: 'designed', label: 'Design invitation' },
  { value: 'uploaded', label: 'Import invitation' },
  { value: 'ai_generated', label: 'Generate copy' },
]

export function InvitationStudio({ event, activeInvitation, publicUrl, initialMode }: InvitationStudioProps) {
  const templates = useMemo(() => getTemplatesForOccasion(event.occasion_type), [event.occasion_type])
  const [mode, setMode] = useState(initialMode && initialMode !== 'skip' ? initialMode : activeInvitation?.source_type ?? 'designed')
  const [templateId, setTemplateId] = useState(activeInvitation?.template_id ?? templates[0]?.id ?? 'custom_minimal')
  const [title, setTitle] = useState(activeInvitation?.title ?? event.title)
  const [subtitle, setSubtitle] = useState(activeInvitation?.subtitle ?? '')
  const [body, setBody] = useState(activeInvitation?.body ?? '')
  const [hostNames, setHostNames] = useState(activeInvitation?.host_names ?? '')
  const [venueName, setVenueName] = useState(activeInvitation?.venue_name ?? '')
  const [venueAddress, setVenueAddress] = useState(activeInvitation?.venue_address ?? event.location ?? '')
  const [dressCode, setDressCode] = useState(activeInvitation?.dress_code ?? '')
  const [rsvpNote, setRsvpNote] = useState(activeInvitation?.rsvp_note ?? '')
  const [supportNote, setSupportNote] = useState(activeInvitation?.support_note ?? '')
  const [fileUrl, setFileUrl] = useState(activeInvitation?.file_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const dateTime = event.event_date ? new Date(event.event_date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : ''
  const whatsappCopy = generateInvitationCopy({
    occasionType: event.occasion_type,
    eventName: title || event.title,
    dateTime: event.event_date,
    location: venueAddress || event.location,
    hostNames,
    rsvpLink: publicUrl,
    contributionLink: `${publicUrl}#pledge`,
    templateId,
  }).whatsappCopy
  const whatsappHref = buildWhatsappShareUrl(whatsappCopy)

  function generateCopy() {
    const copy = generateInvitationCopy({
      occasionType: event.occasion_type,
      tone: mode,
      eventName: event.title,
      dateTime: event.event_date,
      location: venueAddress || event.location,
      hostNames,
      rsvpLink: publicUrl,
      contributionLink: `${publicUrl}#pledge`,
      templateId,
    })
    setTitle(copy.headline)
    setSubtitle(copy.subtitle)
    setBody(copy.body)
    setRsvpNote(copy.rsvpCopy)
    setSupportNote(copy.supportCopy)
    setMode('ai_generated')
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    setMessage('')
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`/api/events/${event.id}/invitations/upload`, { method: 'POST', body: formData })
    const data = await response.json()
    setUploading(false)
    if (!response.ok) {
      setError(data.error ?? 'Upload failed')
      return
    }
    setFileUrl(data.url)
    setMode('uploaded')
    setMessage('Invitation uploaded. Save it to attach it to this event.')
  }

  async function saveInvitation() {
    setSaving(true)
    setError('')
    setMessage('')
    const response = await fetch(`/api/events/${event.id}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitation_type: event.occasion_type ?? 'custom',
        source_type: mode,
        title,
        subtitle,
        body,
        host_names: hostNames,
        venue_name: venueName,
        venue_address: venueAddress,
        dress_code: dressCode,
        rsvp_note: rsvpNote,
        support_note: supportNote,
        template_id: templateId,
        theme_id: INVITATION_TEMPLATES.find(template => template.id === templateId)?.themeId,
        design_json: { templateId, dateTime, whatsappCopy },
        file_url: fileUrl || null,
        preview_url: fileUrl || null,
        is_active: true,
      }),
    })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to save invitation')
      return
    }
    setMessage('Invitation saved and attached to the event.')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Invitation Studio</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Create the guest-facing invite</h2>
          </div>
          <Button type="button" variant="secondary" onClick={generateCopy}>
            <WandSparkles className="h-4 w-4" />
            Generate copy
          </Button>
        </div>

        <div className="mt-5 grid gap-4">
          <Select label="Studio mode" value={mode} onChange={e => setMode(e.target.value)} options={MODE_OPTIONS} />
          <Select
            label="Template"
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            options={templates.map(template => ({ value: template.id, label: template.name }))}
          />

          <div className="rounded-lg border border-white/10 bg-black/10 p-4">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-6 text-sm text-foreground/60 hover:border-white/30">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload image or PDF'}
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={uploadFile} className="hidden" />
            </label>
            <p className="mt-2 text-xs text-foreground/40">PNG, JPEG, WebP, or PDF. Maximum 10 MB.</p>
          </div>

          <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Input label="Subtitle" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
          <Textarea label="Body" rows={5} value={body} onChange={e => setBody(e.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Host names" value={hostNames} onChange={e => setHostNames(e.target.value)} />
            <Input label="Venue name" value={venueName} onChange={e => setVenueName(e.target.value)} />
          </div>
          <Input label="Venue address" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} />
          <Input label="Dress code" value={dressCode} onChange={e => setDressCode(e.target.value)} />
          <Textarea label="RSVP message" rows={2} value={rsvpNote} onChange={e => setRsvpNote(e.target.value)} />
          <Textarea label="Contribution/support note" rows={2} value={supportNote} onChange={e => setSupportNote(e.target.value)} />

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-sage">{message}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={saveInvitation} loading={saving} className="flex-1">Save invitation</Button>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center rounded-lg border border-sage/20 bg-sage/10 px-4 py-2 text-sm font-medium text-sage hover:bg-sage/15">
              Share on WhatsApp
            </a>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/10 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">WhatsApp copy</p>
            <p className="mt-2 text-sm leading-6 text-foreground/70">{whatsappCopy}</p>
          </div>
          <Button type="button" variant="secondary" disabled title="Image export will be added in the next phase.">
            Download image
          </Button>
        </div>
      </section>

      <section>
        <InvitationPreview
          title={title}
          subtitle={subtitle}
          body={body}
          hostNames={hostNames}
          dateTime={dateTime}
          venueName={venueName}
          venueAddress={venueAddress}
          dressCode={dressCode}
          rsvpNote={rsvpNote}
          supportNote={supportNote}
          templateId={templateId}
          fileUrl={fileUrl}
        />
      </section>
    </div>
  )
}
