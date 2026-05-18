import type { OccasionIntelligenceContext } from './context'

export type MemoryActivity = {
  activityType?: string
  title?: string
  createdAt?: string
}

export type EventMemorySnapshotResult = {
  occasionId: string
  generatedAt: string
  summary: string
  recommendations: string[]
  healthScore: number
  topRisks: string[]
  topStrengths: string[]
  events: Array<{ type: string; message: string; timestamp: string }>
}

export type EventMemorySnapshotInput = {
  context: OccasionIntelligenceContext
  summary?: string
  recommendations?: string[]
  healthScore?: number
  topRisks?: string[]
  topStrengths?: string[]
  recentActivity?: MemoryActivity[]
}

export function buildEventMemorySnapshot(
  input: EventMemorySnapshotInput,
): EventMemorySnapshotResult {
  const { context, summary, recommendations, healthScore, topRisks, topStrengths, recentActivity } = input

  return {
    occasionId: context.occasionId,
    generatedAt: new Date().toISOString(),
    summary: summary ?? 'No summary available.',
    recommendations: recommendations ?? [],
    healthScore: healthScore ?? 0,
    topRisks: topRisks ?? [],
    topStrengths: topStrengths ?? [],
    events: (recentActivity ?? []).map(activity => ({
      type: activity.activityType ?? 'unknown',
      message: activity.title ?? 'activity update',
      timestamp: activity.createdAt ?? new Date().toISOString(),
    })),
  }
}

export function summarizeMemoryForEvent(input: EventMemorySnapshotInput) {
  const { context, healthScore, topRisks, topStrengths } = input
  const risks = topRisks?.join(', ') || 'no major risks'
  const strengths = topStrengths?.join(', ') || 'steady foundations'

  return `Event memory snapshot for ${context.title ?? 'this event'}: health score ${healthScore ?? 0}, risks include ${risks}, strengths include ${strengths}.`
}
