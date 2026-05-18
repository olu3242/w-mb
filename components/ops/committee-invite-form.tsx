'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ROLES = [
  'finance_lead',
  'logistics_lead',
  'welfare_coordinator',
  'vendor_coordinator',
  'guest_coordinator',
  'memorial_coordinator',
  'co_organizer',
]

export function CommitteeInviteForm({ eventId }: { eventId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('co_organizer')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const response = await fetch('/api/committee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasionId: eventId, name, email, role }),
    })

    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to invite committee member')
      return
    }

    setMessage('Committee invite queued.')
    setName('')
    setEmail('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 p-4">
      <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <div>
        <label className="text-xs font-medium text-foreground/60">Role</label>
        <select value={role} onChange={e => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
          {ROLES.map(option => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" loading={loading}>Invite committee member</Button>
    </form>
  )
}
