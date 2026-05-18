'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function OrganizationFundForm({ organizationId }: { organizationId: string }) {
  const [name, setName] = useState('')
  const [fundType, setFundType] = useState('welfare_support')
  const [visibility, setVisibility] = useState('members')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/organizations/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, name, fundType, visibility }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to create fund')
      return
    }
    setMessage('Contribution pool opened.')
    setName('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 p-4">
      <Input label="Fund name" value={name} onChange={e => setName(e.target.value)} required />
      <select value={fundType} onChange={e => setFundType(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
        {['welfare_support', 'emergency_relief', 'building', 'education_support', 'burial_support', 'general'].map(option => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
      </select>
      <select value={visibility} onChange={e => setVisibility(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
        {['members', 'private', 'public'].map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" size="sm" loading={loading}>Open fund</Button>
    </form>
  )
}
