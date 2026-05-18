import type { AIChatMessage, AIClient } from './index'

const FALLBACK_PATTERNS: Array<{ matcher: RegExp; response: string }> = [
  {
    matcher: /schedule|program|timeline/i,
    response: 'I recommend a three-part event program with arrival, main celebration, and closing rituals. Start with guest arrival, follow with vendor confirmations, and end with a concise wrap-up and tribute.',
  },
  {
    matcher: /vendor|supplier/i,
    response: 'Focus on the highest risk vendor categories first: catering, venue, transportation, and entertainment. Compare two vendors per category and capture price, availability, and payment terms.',
  },
  {
    matcher: /budget|funding/i,
    response: 'Review the funding gap, prioritize the highest-impact sponsorships, and keep contingency funding for logistics and guest comfort.',
  },
  {
    matcher: /reminder|alert/i,
    response: 'Set reminders for RSVP follow-up, vendor confirmations, and day-of check-in coordination. Keep messages brief, concrete, and tied to a date or milestone.',
  },
  {
    matcher: /health|score/i,
    response: 'Monitor task completion, guest RSVPs, vendor confirmations, and budget variance. Those four signals deliver the strongest operational health signal on the day of the event.',
  },
]

export class DeterministicProvider implements AIClient {
  async chat(messages: AIChatMessage[]) {
    const prompt = messages.map(message => message.content).join('\n')
    const candidate = FALLBACK_PATTERNS.find(pattern => pattern.matcher.test(prompt))
    const text = candidate?.response ?? 'I am ready to help with your event planning question. Please provide more details if you can.'
    return { text, raw: { deterministic: true } }
  }
}
