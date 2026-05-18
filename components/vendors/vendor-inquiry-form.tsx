'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'

export function VendorInquiryForm({
  eventId,
  vendorId,
  eventDate,
}: {
  eventId: string
  vendorId: string
  eventDate?: string | null
}) {
  const [message, setMessage] = useState('Hi, I would like to request availability and a quote for this event.')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/vendor-inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasion_id: eventId, vendor_id: vendorId, message, event_date: eventDate }),
    })

    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to request quote')
      return
    }

    setDone(true)
  }

  if (done) return <p className="text-xs font-medium text-sage">Quote request sent</p>

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3">
      <Textarea label="Quote request" value={message} onChange={e => setMessage(e.target.value)} rows={2} required />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button type="submit" size="sm" loading={loading}>Request quote</Button>
    </form>
  )
}
