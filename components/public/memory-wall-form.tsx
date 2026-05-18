'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

export function MemoryWallForm({ eventId, respectful }: { eventId: string; respectful: boolean }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/memory-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        occasion_id: eventId,
        author_name: name,
        message,
        post_type: respectful ? 'tribute' : 'message',
      }),
    })

    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to add message')
      return
    }

    setDone(true)
    setName('')
    setMessage('')
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-white/5 p-4">
      {done && <p className="rounded-lg border border-sage/20 bg-sage/5 px-3 py-2 text-sm text-sage">Message added.</p>}
      <Input label="Your name *" value={name} onChange={e => setName(e.target.value)} required />
      <Textarea
        label={respectful ? 'Tribute or condolence *' : 'Memory or message *'}
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={respectful ? 'Share a memory, prayer, or condolence.' : 'Share a favorite memory or note.'}
        rows={3}
        required
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" loading={loading}>{respectful ? 'Add tribute' : 'Add memory'}</Button>
    </form>
  )
}
