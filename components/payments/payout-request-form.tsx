'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function PayoutRequestForm({ eventId, available }: { eventId: string; available: number }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const response = await fetch('/api/payout-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasionId: eventId, amount: Number(amount), currency: 'USD' }),
    })

    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to request payout')
      return
    }

    setMessage(`Payout request created: ${data.trust_status}`)
    setAmount('')
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3">
      <Input
        label="Request amount (USD)"
        type="number"
        min="1"
        max={Math.max(0, available / 100)}
        step="0.01"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        required
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" size="sm" loading={loading} disabled={available <= 0}>Request review</Button>
    </form>
  )
}
