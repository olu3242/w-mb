import { ClaudeProvider } from './claude'
import { DeterministicProvider } from './deterministic'
import { OpenAIProvider } from './openai'

export type AIProviderName = 'openai' | 'claude' | 'deterministic'

export type AIChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIChatResponse = {
  text: string
  raw: unknown
}

export interface AIClient {
  chat(messages: AIChatMessage[]): Promise<AIChatResponse>
}

export function createAIClient(providerName: AIProviderName) {
  if (providerName === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI provider')
    }
    return new OpenAIProvider(apiKey)
  }

  if (providerName === 'claude') {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is required for Claude provider')
    }
    return new ClaudeProvider(apiKey)
  }

  return new DeterministicProvider()
}

export function getDefaultProviderName(): AIProviderName {
  const provider = process.env.AI_PROVIDER?.toLowerCase()
  if (provider === 'openai' || provider === 'claude') return provider
  return 'deterministic'
}
