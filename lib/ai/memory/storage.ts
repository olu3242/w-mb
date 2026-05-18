import type { OccasionIntelligenceContext } from '../context'

export type MemoryActivity = {
  activityType?: string
  title?: string
  createdAt?: string
}

export type EventMemorySnapshot = {
  occasionId: string
  generatedAt: string
  summary: string
  recommendations: string[]
  healthScore: number
  topRisks: string[]
  topStrengths: string[]
  events: Array<{ type: string; message: string; timestamp: string }>
}

export function buildEventMemorySnapshot(input: {
  context: OccasionIntelligenceContext
  summary?: string
  recommendations?: string[]
  healthScore?: number
  topRisks?: string[]
  topStrengths?: string[]
  recentActivity?: MemoryActivity[]
}): EventMemorySnapshot {
  return {
    occasionId: input.context.occasionId,
    generatedAt: new Date().toISOString(),
    summary: input.summary ?? 'No summary available.',
    recommendations: input.recommendations ?? [],
    healthScore: input.healthScore ?? 0,
    topRisks: input.topRisks ?? [],
    topStrengths: input.topStrengths ?? [],
    events: (input.recentActivity ?? []).map(activity => ({
      type: activity.activityType ?? 'unknown',
      message: activity.title ?? 'activity update',
      timestamp: activity.createdAt ?? new Date().toISOString(),
    })),
  }
}
