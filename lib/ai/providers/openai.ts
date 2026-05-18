import type { AIChatMessage, AIClient } from './index'

const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

export class OpenAIProvider implements AIClient {
  constructor(private apiKey: string) {}

  async chat(messages: AIChatMessage[]) {
    const response = await fetch(OPENAI_CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.35,
        messages: messages.map(message => ({ role: message.role, content: message.content })),
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`OpenAI request failed: ${response.status} ${body}`)
    }

    const data = await response.json()
    const text = String(data.choices?.[0]?.message?.content ?? '')
    return { text, raw: data }
  }
}
