import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export type TrustDecision = 'allow' | 'review' | 'block'

export type TrustResult = {
  decision: TrustDecision
  score: number
  reasons: string[]
}

export async function scorePayoutRequest(
  supabase: SupabaseClient<Database, 'public'>,
  input: {
    occasionId: string
    requestedAmount: number
    requestedAt?: Date
  },
): Promise<TrustResult> {
  const reasons: string[] = []
  let score = 0

  const [{ data: event }, { data: contributions }] = await Promise.all([
    supabase.from('events').select('created_at').eq('id', input.occasionId).single(),
    supabase
      .from('contributions')
      .select('amount, contributor_email, contributor_name, is_anonymous, created_at')
      .eq('occasion_id', input.occasionId)
      .eq('status', 'paid'),
  ])

  const paid = contributions ?? []
  const totalPaid = paid.reduce((sum, contribution) => sum + Number(contribution.amount), 0)
  const anonymousTotal = paid.filter(contribution => contribution.is_anonymous).reduce((sum, contribution) => sum + Number(contribution.amount), 0)
  const largestContribution = paid.reduce((max, contribution) => Math.max(max, Number(contribution.amount)), 0)
  const eventAgeHours = event?.created_at
    ? (Date.now() - new Date(event.created_at).getTime()) / 36e5
    : 0

  if (input.requestedAmount > totalPaid) {
    score += 100
    reasons.push('requested_amount_exceeds_paid_balance')
  }

  if (largestContribution >= 500000) {
    score += 30
    reasons.push('unusually_large_contribution')
  }

  if (eventAgeHours < 24 && input.requestedAmount >= 10000) {
    score += 30
    reasons.push('payout_requested_soon_after_event_creation')
  }

  if (totalPaid > 0 && anonymousTotal / totalPaid > 0.6) {
    score += 25
    reasons.push('high_anonymous_contribution_ratio')
  }

  const identityCounts = new Map<string, number>()
  paid.forEach(contribution => {
    const key = (contribution.contributor_email || contribution.contributor_name || '').toLowerCase()
    if (key) identityCounts.set(key, (identityCounts.get(key) ?? 0) + 1)
  })

  if ([...identityCounts.values()].some(count => count >= 4)) {
    score += 25
    reasons.push('many_contributions_from_same_identity')
  }

  if (score >= 100) return { decision: 'block', score, reasons }
  if (score >= 25 || input.requestedAmount > 0) return { decision: 'review', score, reasons: reasons.length ? reasons : ['first_payout_requires_review'] }
  return { decision: 'allow', score, reasons }
}

export function trustMetadata(result: TrustResult): Json {
  return { decision: result.decision, score: result.score, reasons: result.reasons }
}
