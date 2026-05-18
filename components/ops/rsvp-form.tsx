'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

export function RsvpForm({ token, defaultCount }: { token: string; defaultCount: number }) {
  const [status, setStatus] = useState<'accepted' | 'declined' | 'maybe'>('accepted')
  const [attendeeCount, setAttendeeCount] = useState(String(defaultCount))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/rsvps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: token, status, attendeeCount: Number(attendeeCount), note }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to save RSVP')
      return
    }
    setDone(true)
  }

  if (done) {
    return <div className="rounded-xl border border-sage/20 bg-sage/5 p-5 text-center text-sage">RSVP saved. Thank you.</div>
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-white/5 p-4">
      <div className="grid grid-cols-3 gap-2">
        {(['accepted', 'maybe', 'declined'] as const).map(option => (
          <button
            key={option}
            type="button"
            onClick={() => setStatus(option)}
            className={`rounded-lg border px-3 py-2 text-sm ${status === option ? 'border-pulse/40 bg-pulse/10 text-pulse' : 'border-white/10 text-foreground/60'}`}
          >
            {option}
          </button>
        ))}
      </div>
      {status !== 'declined' && <Input label="Attendee count" type="number" min="1" max="20" value={attendeeCount} onChange={e => setAttendeeCount(e.target.value)} />}
      <Textarea label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} rows={3} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button type="submit" loading={loading}>Submit RSVP</Button>
    </form>
  )
}
