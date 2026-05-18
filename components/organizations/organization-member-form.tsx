'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function OrganizationMemberForm({ organizationId }: { organizationId: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    const response = await fetch('/api/organizations/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, name, email, role }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to invite member')
      return
    }
    setMessage('Member invite created.')
    setName('')
    setEmail('')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-white/5 p-4">
      <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <select value={role} onChange={e => setRole(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
        {['admin', 'finance', 'welfare', 'logistics', 'coordinator', 'member'].map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-sage">{message}</p>}
      <Button type="submit" size="sm" loading={loading}>Invite member</Button>
    </form>
  )
}
