export { buildEventIntelligenceContext } from './context'
export { calculateHealthScore } from './health-score'
export { generateEventSummary, getInsightFeed } from './summaries'
export { getRecommendations } from './recommendations'

import { evaluateAutomationRules } from './automation'
import { generateEventSummary, getInsightFeed } from './summaries'
import { calculateHealthScore } from './health-score'
import { getRecommendations } from './recommendations'
import type { OccasionIntelligenceContext } from './context'

export type OrchestrationResult = {
  context: OccasionIntelligenceContext
  recommendations: Awaited<ReturnType<typeof getRecommendations>>
  healthScore: ReturnType<typeof calculateHealthScore>
  summary: ReturnType<typeof generateEventSummary>
  insights: ReturnType<typeof getInsightFeed>
  automationTriggers: ReturnType<typeof evaluateAutomationRules>
}

export async function orchestrateEvent(context: OccasionIntelligenceContext) {
  return {
    context,
    recommendations: await getRecommendations(context),
    healthScore: calculateHealthScore(context),
    summary: generateEventSummary(context),
    insights: getInsightFeed(context),
    automationTriggers: evaluateAutomationRules(context),
  }
}

export function explainOrchestrator() {
  return {
    description:
      'The event orchestrator evaluates health, recommendations, summaries, insights, and automation triggers to give teams a single operational view.',
  }
}
