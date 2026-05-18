'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { ORGANIZATION_TYPES } from '@/lib/organization/utils'

export function OrganizationCreateForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [organizationType, setOrganizationType] = useState('church')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, organizationType, description, country, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to create organization')
      return
    }
    router.push(`/organizations/${data.slug}`)
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-white/5 p-4">
      <Input label="Organization name" value={name} onChange={e => setName(e.target.value)} required />
      <div>
        <label className="text-xs font-medium text-foreground/60">Organization type</label>
        <select value={organizationType} onChange={e => setOrganizationType(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
          {ORGANIZATION_TYPES.map(type => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <Input label="Country" value={country} onChange={e => setCountry(e.target.value)} />
      <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button type="submit" loading={loading}>Create organization</Button>
    </form>
  )
}
