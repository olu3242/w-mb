'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type EventOption = { id: string; title: string }

export function OrganizationEventLinkForm({ organizationId, events }: { organizationId: string; events: EventOption[] }) {
  const [occasionId, setOccasionId] = useState(events[0]?.id ?? '')
  const [recurrenceLabel, setRecurrenceLabel] = useState('Monthly meeting')
  const [recurrenceRule, setRecurrenceRule] = useState('FREQ=MONTHLY')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/organizations/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, occasionId, recurrenceLabel, recurrenceRule }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to link event')
      return
    }
    setMessage('Recurring event linked.')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 p-4">
      <select value={occasionId} onChange={e => setOccasionId(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
        {events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}
      </select>
      <Input label="Recurrence label" value={recurrenceLabel} onChange={e => setRecurrenceLabel(e.target.value)} />
      <Input label="Recurrence rule" value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value)} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" size="sm" loading={loading} disabled={!events.length}>Link recurring event</Button>
    </form>
  )
}
