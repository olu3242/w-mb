import { buildEventIntelligenceContext } from './context'
import { getRecommendations, type Recommendation, type RecommendationType } from './recommendations'
import { calculateHealthScore, type HealthScoreResult } from './health-score'
import { generateEventSummary, getInsightFeed } from './summaries'
import type { OccasionIntelligenceContext } from './context'

export type { OccasionIntelligenceContext, Recommendation, RecommendationType, HealthScoreResult }

export function getDeterministicRecommendations(context: OccasionIntelligenceContext): Recommendation[] {
  return getRecommendations(context)
}

export {
  buildEventIntelligenceContext,
  calculateHealthScore,
  generateEventSummary,
  getInsightFeed,
  getRecommendations,
}
