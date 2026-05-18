'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EventSchema } from '@/lib/validations'
import { getOccasionTheme, OCCASION_THEME_OPTIONS } from '@/lib/occasion/theme-config'
import type { OccasionType } from '@/lib/occasion/occasion-types'

type Step1 = { title: string; description: string; event_date: string; location: string }
type Step2 = { is_public: boolean; signals: Record<string, boolean> }
type ContextAnswers = { outcome: string; guestMood: string; concern: string }
type InvitationIntent = 'skip' | 'uploaded' | 'designed' | 'ai_generated'

const SIGNALS = [
  { key: 'has_contributions', label: 'Gift registry & contributions' },
  { key: 'has_venue', label: 'Venue tools' },
  { key: 'has_vendors', label: 'Vendor hub' },
  { key: 'has_tasks', label: 'Task board' },
  { key: 'has_timeline', label: 'Execution timeline' },
  { key: 'has_budget_profile', label: 'Budget engine' },
]

const DEFAULT_THEME = getOccasionTheme('custom')

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionType | null>(null)
  const [step1, setStep1] = useState<Step1>({ title: '', description: '', event_date: '', location: '' })
  const [step2, setStep2] = useState<Step2>({
    is_public: true,
    signals: { alice_calibrated: false, alice_budget_generated: false },
  })
  const [contextAnswers, setContextAnswers] = useState<ContextAnswers>({
    outcome: '',
    guestMood: '',
    concern: '',
  })
  const [invitationIntent, setInvitationIntent] = useState<InvitationIntent>('skip')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const theme = useMemo(
    () => (selectedOccasion ? getOccasionTheme(selectedOccasion) : DEFAULT_THEME),
    [selectedOccasion],
  )

  function handleStep1(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setStep1(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  function toggleSignal(key: string) {
    setStep2(p => ({ ...p, signals: { ...p.signals, [key]: !p.signals[key] } }))
  }

  function handleContextChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setContextAnswers(p => ({ ...p, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedOccasion) {
      setError('Please select an occasion type before creating your event.')
      setLoading(false)
      return
    }

    try {
      const parsed = EventSchema.parse({
        ...step1,
        event_date: step1.event_date ? new Date(step1.event_date).toISOString() : undefined,
        is_public: step2.is_public,
        occasion_type: selectedOccasion,
        theme_id: theme.id,
        emotional_mode: theme.emotionalTone,
        ai_plan_seed: {
          occasion: theme.label,
          tone: theme.emotionalTone,
          intro: theme.aiIntroCopy,
          onboarding_copy: theme.onboardingCopy ?? theme.aiIntroCopy,
          recommended_modules: theme.recommendedModules,
          vendor_categories: theme.suggestedVendorCategories,
          budget_categories: theme.suggestedBudgetCategories,
          context_answers: contextAnswers,
          invitation_intent: invitationIntent,
        },
        modules: theme.recommendedModules,
      })

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed, signals: step2.signals }),
      })

      if (response.status === 401) {
        router.push('/login?next=/events/new')
        return
      }

      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Something went wrong')
      router.push(invitationIntent === 'skip' ? `/events/${data.slug}` : `/events/${data.slug}/invitations?mode=${invitationIntent}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-8 grid grid-cols-6 gap-3 text-xs text-foreground/60">
        {['Occasion', 'Theme preview', 'AI plan', 'Event details', 'Invitation', 'Review'].map((label, index) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className={`h-2 w-full rounded-full ${step > index ? 'bg-pulse' : 'bg-white/10'}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-foreground/60">Step 1 of 6</p>
            <h1 className="mt-3 text-3xl font-bold">Choose your occasion</h1>
            <p className="mt-2 max-w-2xl text-sm text-foreground/70">
              Start with the right occasion type so Owambe OS can activate the right planning theme, tone, and event modules.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OCCASION_THEME_OPTIONS.map(option => {
              const isSelected = selectedOccasion === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedOccasion(option.id)}
                  aria-pressed={isSelected}
                  className={`group rounded-3xl border p-6 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    isSelected
                      ? `border-white/20 bg-white/5 shadow-xl ${option.bgClass}`
                      : 'border-white/10 bg-[#040404] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${option.primaryColor}`}>{option.label}</p>
                      <p className="mt-3 text-sm text-foreground/60">{option.description}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold text-void ${option.accentColor}`}>
                      {option.label === 'Custom Occasion' ? 'Custom' : option.label.split(' ')[0]}
                    </div>
                  </div>
                  <div className="mt-4 text-[13px] text-foreground/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground/70">Recommended modules</p>
                      {isSelected ? (
                        <span className="rounded-full bg-pulse/20 px-2 py-1 text-[11px] font-semibold text-pulse">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 leading-6">{option.recommendedModules.slice(0, 3).join(' · ')}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!selectedOccasion}
              onClick={() => selectedOccasion && setStep(2)}
              className="rounded-lg bg-pulse px-6 py-3 font-semibold text-void transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-pulse/90"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">Step 2 of 6</p>
            <h1 className="text-3xl font-bold">Theme activation preview</h1>
            <p className="max-w-2xl text-sm text-foreground/70">
              {theme.onboardingCopy ?? 'This occasion theme is now active. Owambe will tailor your planning workspace with the right tone, modules, and recommendations.'}
            </p>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-[#040404] p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Emotional tone</p>
              <p className="mt-2 text-lg font-semibold text-foreground/100">{theme.emotionalTone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Typography</p>
              <p className="mt-2 text-sm text-foreground/60">{theme.typography ?? 'Modern expressive'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Preview style</p>
              <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${theme.accentColor} text-void`}>Activated</div>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-[#040404] p-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">What Owambe will prepare</h2>
              <p className="mt-2 text-sm text-foreground/60">Modules: {theme.recommendedModules.join(', ')}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Vendor focus</h2>
              <p className="mt-2 text-sm text-foreground/60">{theme.suggestedVendorCategories.join(', ')}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Budget foundation</h2>
              <p className="mt-2 text-sm text-foreground/60">{theme.suggestedBudgetCategories.join(', ')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-white/10 py-3 text-sm hover:border-white/20 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`flex-1 rounded-lg py-3 text-sm font-semibold text-void ${theme.accentColor} hover:opacity-95 transition-opacity`}
            >
              Continue to AI plan
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">Step 3 of 6</p>
            <h1 className="mt-2 text-3xl font-bold">AI planning intro</h1>
            <p className="mt-2 text-sm text-foreground/70">{theme.aiIntroCopy}</p>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-[#040404] p-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Recommended modules</h2>
              <p className="mt-2 text-sm text-foreground/60">{theme.recommendedModules.join(', ')}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Suggested vendor categories</h2>
              <p className="mt-2 text-sm text-foreground/60">{theme.suggestedVendorCategories.join(', ')}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground/90">Budget categories</h2>
              <p className="mt-2 text-sm text-foreground/60">{theme.suggestedBudgetCategories.join(', ')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-white/10 py-3 text-sm hover:border-white/20 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className={`flex-1 rounded-lg py-3 text-sm font-semibold text-void ${theme.accentColor} hover:opacity-95 transition-opacity`}
            >
              Continue to details
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">Step 4 of 6</p>
            <h1 className="mt-2 text-3xl font-bold">Event details</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Share the details and context so Owambe can generate a starter workspace that feels right for this occasion.
            </p>
          </div>

          <div className="grid gap-4">
            <input
              name="title"
              placeholder="Event name *"
              value={step1.title}
              onChange={handleStep1}
              required
              className="rounded-3xl border border-white/10 bg-[#040404] px-4 py-3 text-sm outline-none focus:border-pulse/60"
            />
            <textarea
              name="description"
              placeholder="Description (optional)"
              value={step1.description}
              onChange={handleStep1}
              rows={4}
              className="rounded-3xl border border-white/10 bg-[#040404] px-4 py-3 text-sm outline-none focus:border-pulse/60 resize-none"
            />
            <input
              name="event_date"
              type="datetime-local"
              value={step1.event_date}
              onChange={handleStep1}
              className="rounded-3xl border border-white/10 bg-[#040404] px-4 py-3 text-sm outline-none focus:border-pulse/60"
            />
            <input
              name="location"
              placeholder="Location (optional)"
              value={step1.location}
              onChange={handleStep1}
              className="rounded-3xl border border-white/10 bg-[#040404] px-4 py-3 text-sm outline-none focus:border-pulse/60"
            />
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-[#040404] p-5">
            <div>
              <p className="text-sm font-semibold text-foreground/90">What outcome matters most?</p>
              <input
                name="outcome"
                value={contextAnswers.outcome}
                onChange={handleContextChange}
                placeholder="Example: meaningful guest experience"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-[#010101] px-4 py-3 text-sm outline-none focus:border-pulse/60"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90">What should guests feel?</p>
              <input
                name="guestMood"
                value={contextAnswers.guestMood}
                onChange={handleContextChange}
                placeholder="Example: celebratory, calm, supportive"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-[#010101] px-4 py-3 text-sm outline-none focus:border-pulse/60"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90">Biggest planning concern</p>
              <textarea
                name="concern"
                value={contextAnswers.concern}
                onChange={handleContextChange}
                rows={3}
                placeholder="Example: vendor coordination, guest logistics, or funding"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-[#010101] px-4 py-3 text-sm outline-none focus:border-pulse/60 resize-none"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#040404] p-5">
            <p className="text-sm font-semibold text-foreground/90">Features & visibility</p>
            <div className="mt-4 grid gap-3">
              {SIGNALS.map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 p-3 hover:border-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!step2.signals[key]}
                    onChange={() => toggleSignal(key)}
                    className="accent-pulse"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 p-3 hover:border-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={step2.is_public}
                  onChange={e => setStep2(p => ({ ...p, is_public: e.target.checked }))}
                  className="accent-pulse"
                />
                <span className="text-sm">Public guest page</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg border border-white/10 py-3 text-sm hover:border-white/20 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => step1.title.trim() && setStep(5)}
              disabled={!step1.title.trim()}
              className="flex-1 rounded-lg bg-pulse py-3 text-sm font-semibold text-void transition-colors disabled:opacity-50"
            >
              Continue to invitation
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">Step 5 of 6</p>
            <h1 className="mt-2 text-3xl font-bold">Invitation</h1>
            <p className="mt-2 text-sm text-foreground/70">
              This step is optional. Choose how you want to start, and Owambe will open Invitation Studio after the event workspace is created.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: 'skip', title: 'Skip for now', body: 'Create the event first and return to invitations later.' },
              { value: 'uploaded', title: 'Import invitation', body: 'Upload an existing image or PDF after the event is created.' },
              { value: 'designed', title: 'Design invitation', body: 'Use a simple template and live preview in Owambe.' },
              { value: 'ai_generated', title: 'Generate copy', body: 'Start with deterministic Owambe-style invitation copy.' },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setInvitationIntent(option.value as InvitationIntent)}
                className={`rounded-2xl border p-4 text-left transition-colors ${invitationIntent === option.value ? 'border-pulse/50 bg-pulse/10' : 'border-white/10 bg-[#040404] hover:border-white/20'}`}
              >
                <p className="text-sm font-semibold text-foreground">{option.title}</p>
                <p className="mt-2 text-sm leading-6 text-foreground/60">{option.body}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 rounded-lg border border-white/10 py-3 text-sm hover:border-white/20 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(6)}
              className="flex-1 rounded-lg bg-pulse py-3 text-sm font-semibold text-void transition-colors"
            >
              Continue to review
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">Step 6 of 6</p>
            <h1 className="mt-2 text-3xl font-bold">Review & create</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Confirm the occasion, theme, and event details before you create the workspace.
            </p>
          </div>

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-[#040404] p-5">
            <div>
              <p className="text-sm uppercase text-foreground/50">Occasion</p>
              <p className={`mt-2 text-lg font-semibold ${theme.primaryColor}`}>{theme.label}</p>
              <p className="mt-1 text-sm text-foreground/60">{theme.description}</p>
            </div>
            <div>
              <p className="text-sm uppercase text-foreground/50">Event details</p>
              <p className="mt-2 text-sm text-foreground/60">{step1.title}</p>
              {step1.description && <p className="mt-1 text-sm text-foreground/60">{step1.description}</p>}
              {step1.event_date && <p className="mt-1 text-sm text-foreground/60">{new Date(step1.event_date).toLocaleString()}</p>}
              {step1.location && <p className="mt-1 text-sm text-foreground/60">{step1.location}</p>}
            </div>
            <div>
              <p className="text-sm uppercase text-foreground/50">Context answers</p>
              <p className="mt-2 text-sm text-foreground/60">Outcome: {contextAnswers.outcome || 'Not specified'}</p>
              <p className="mt-2 text-sm text-foreground/60">Guest mood: {contextAnswers.guestMood || 'Not specified'}</p>
              <p className="mt-2 text-sm text-foreground/60">Concern: {contextAnswers.concern || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm uppercase text-foreground/50">Recommendations</p>
              <p className="mt-2 text-sm text-foreground/60">Modules: {theme.recommendedModules.join(', ')}</p>
              <p className="mt-2 text-sm text-foreground/60">Suggested vendors: {theme.suggestedVendorCategories.join(', ')}</p>
              <p className="mt-2 text-sm text-foreground/60">Budget categories: {theme.suggestedBudgetCategories.join(', ')}</p>
            </div>
            <div>
              <p className="text-sm uppercase text-foreground/50">Invitation</p>
              <p className="mt-2 text-sm text-foreground/60">{invitationIntent === 'skip' ? 'Skip for now' : invitationIntent.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex-1 rounded-lg border border-white/10 py-3 text-sm hover:border-white/20 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 rounded-lg py-3 text-sm font-semibold text-void ${theme.accentColor} hover:opacity-95 transition-opacity disabled:opacity-50`}
            >
              {loading ? 'Creating…' : theme.ctaCopy}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
