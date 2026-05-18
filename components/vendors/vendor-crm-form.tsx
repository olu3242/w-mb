'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

export function VendorCrmForm({ vendorId, inquiryId }: { vendorId: string; inquiryId?: string }) {
  const [stage, setStage] = useState('contacted')
  const [estimatedValue, setEstimatedValue] = useState('0')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/vendor-crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, inquiryId, stage, estimatedValue: Number(estimatedValue), note }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to update CRM')
      return
    }
    setMessage('Lead updated.')
    setNote('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 p-4">
      <select value={stage} onChange={e => setStage(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
        {['new', 'contacted', 'quoted', 'won', 'lost'].map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <Input label="Estimated value (USD)" type="number" min="0" step="0.01" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
      <Textarea label="CRM note" value={note} onChange={e => setNote(e.target.value)} rows={3} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" size="sm" loading={loading}>Update lead</Button>
    </form>
  )
}
