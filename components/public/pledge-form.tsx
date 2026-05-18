'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

type SponsorCategory = {
  id: string
  name: string
  description: string | null
}

export function PledgeForm({ eventId, categories }: { eventId: string; categories: SponsorCategory[] }) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        occasionId: eventId,
        sponsorshipCategoryId: categoryId || null,
        contributorName: anonymous ? 'Anonymous supporter' : name,
        contributorEmail: email,
        amount: Number(amount),
        currency: 'USD',
        message,
        isAnonymous: anonymous,
      }),
    })

    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to start checkout')
      return
    }

    window.location.href = data.url
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-white/5 p-4">
      <div>
        <label className="text-xs font-medium text-foreground/60">Sponsor category</label>
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-pulse/60"
        >
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>
      <Input label="Contribution amount (USD) *" type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
      {!anonymous && <Input label="Your name *" value={name} onChange={e => setName(e.target.value)} required />}
      <Input label="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <Textarea label="Message (optional)" value={message} onChange={e => setMessage(e.target.value)} rows={3} />
      <label className="flex items-center gap-3 text-sm text-foreground/70">
        <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="accent-pulse" />
        Show my contribution as anonymous
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-foreground/40">You will be redirected to Stripe Checkout. Payment status updates after checkout completes.</p>
      <Button type="submit" loading={loading}>Contribute</Button>
    </form>
  )
}
