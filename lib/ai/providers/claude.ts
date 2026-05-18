import type { AIChatMessage, AIClient } from './index'

const CLAUDE_COMPLETION_URL = 'https://api.anthropic.com/v1/complete'

export class ClaudeProvider implements AIClient {
  constructor(private apiKey: string) {}

  async chat(messages: AIChatMessage[]) {
    const prompt = messages
      .map(message => {
        const role = message.role === 'user' ? 'Human' : message.role === 'assistant' ? 'Assistant' : 'System'
        return `${role}: ${message.content}`
      })
      .join('\n\n') + '\n\nAssistant:'

    const response = await fetch(CLAUDE_COMPLETION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        model: 'claude-3.5',
        prompt,
        max_tokens_to_sample: 600,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Claude request failed: ${response.status} ${body}`)
    }

    const data = await response.json()
    const text = String(data.completion ?? '')
    return { text, raw: data }
  }
}
