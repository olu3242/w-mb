'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function GuestInviteForm({ eventId }: { eventId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [guestCount, setGuestCount] = useState('1')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInviteLink('')

    const response = await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasionId: eventId, name, email, phone, guestCount: Number(guestCount) }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to invite guest')
      return
    }

    setInviteLink(`${window.location.origin}/rsvp/${data.invitation_token}`)
    setName('')
    setEmail('')
    setPhone('')
    setGuestCount('1')
  }

  const whatsappText = inviteLink ? encodeURIComponent(`You're invited. Please RSVP here: ${inviteLink}`) : ''

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 p-4">
      <Input label="Guest name" value={name} onChange={e => setName(e.target.value)} required />
      <Input label="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <Input label="Phone / WhatsApp (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
      <Input label="Party size" type="number" min="1" max="20" value={guestCount} onChange={e => setGuestCount(e.target.value)} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {inviteLink && (
        <div className="rounded-lg border border-sage/20 bg-sage/5 p-3 text-xs">
          <p className="text-sage">RSVP link ready</p>
          <p className="mt-1 break-all text-foreground/60">{inviteLink}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="inline-flex rounded-lg border border-pulse/30 bg-pulse/5 px-3 py-1 text-xs font-semibold text-pulse hover:bg-pulse/10" href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 2000)
                } catch {
                  setCopied(false)
                }
              }}
              className="inline-flex rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-foreground hover:border-white/20"
            >
              {copied ? 'Link copied' : 'Copy link'}
            </button>
          </div>
        </div>
      )}
      <Button type="submit" loading={loading}>Invite guest</Button>
    </form>
  )
}
