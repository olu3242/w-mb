import { createAIClient, getDefaultProviderName, type AIChatMessage } from '../providers'
import { eventHealthPrompt, planningQuestionPrompt, scheduleGenerationPrompt, whatsappMessagePrompt } from '../prompts/assistant'
import type { OccasionIntelligenceContext } from '../context'
import { buildEventMemorySnapshot } from '../memory'

export async function askAssistant(question: string, context: OccasionIntelligenceContext) {
  const client = createAIClient(getDefaultProviderName())
  const messages: AIChatMessage[] = [
    { role: 'system', content: 'You are Owambe AI, a social event operations assistant.' },
    { role: 'user', content: planningQuestionPrompt(question, context) },
  ]

  return client.chat(messages)
}

export async function summarizeEventHealth(context: OccasionIntelligenceContext) {
  const client = createAIClient(getDefaultProviderName())
  const messages: AIChatMessage[] = [
    { role: 'system', content: 'You are Owambe AI, the event health monitor.' },
    { role: 'user', content: eventHealthPrompt(context) },
  ]

  return client.chat(messages)
}

export async function generateEventSchedule(context: OccasionIntelligenceContext) {
  const client = createAIClient(getDefaultProviderName())
  const messages: AIChatMessage[] = [
    { role: 'system', content: 'You are Owambe AI, the event schedule architect.' },
    { role: 'user', content: scheduleGenerationPrompt(context) },
  ]

  return client.chat(messages)
}

export async function generateWhatsappMessage(template: 'rsvp' | 'reminder' | 'vendor_checkin', context: OccasionIntelligenceContext) {
  const client = createAIClient(getDefaultProviderName())
  const messages: AIChatMessage[] = [
    { role: 'system', content: 'You are Owambe AI, generating WhatsApp-ready messages for event operations.' },
    { role: 'user', content: whatsappMessagePrompt(template, context) },
  ]

  return client.chat(messages)
}

export async function buildAssistantMemory(context: OccasionIntelligenceContext, userId?: string) {
  const memory = buildEventMemorySnapshot({
    context,
    summary: `Event ${context.title ?? 'unknown'} snapshot at ${new Date().toISOString()}`,
    recommendations: [],
    healthScore: context.healthScore?.overall ?? 0,
    topRisks: context.healthScore?.topRisks ?? [],
    topStrengths: context.healthScore?.topStrengths ?? [],
    recentActivity: [],
  })

  return {
    memory,
    note: `Built assistant memory for ${context.title ?? 'event'}`,
    userId,
  }
}
