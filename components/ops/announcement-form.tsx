'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

export function AnnouncementForm({ eventId }: { eventId: string }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('guests')
  const [channel, setChannel] = useState('whatsapp_ready')
  const [publishUpdate, setPublishUpdate] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const response = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasionId: eventId, title, body, audience, channel, publishUpdate }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to post announcement')
      return
    }

    setMessage('Announcement posted.')
    setTitle('')
    setBody('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 p-4">
      <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} required />
      <Textarea label="Message" value={body} onChange={e => setBody(e.target.value)} rows={4} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-foreground/60">Audience</label>
          <select value={audience} onChange={e => setAudience(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            {['guests', 'committee', 'contributors', 'public'].map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground/60">Channel</label>
          <select value={channel} onChange={e => setChannel(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            {['in_app', 'email', 'whatsapp_ready'].map(option => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm text-foreground/70">
        <input type="checkbox" checked={publishUpdate} onChange={e => setPublishUpdate(e.target.checked)} className="accent-pulse" />
        Also publish as event update
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" loading={loading}>Post announcement</Button>
    </form>
  )
}
