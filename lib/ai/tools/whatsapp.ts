import type { OccasionIntelligenceContext } from '../context'
import { generateWhatsappMessage } from '../chat/assistant'

export async function buildWhatsappReminder(context: OccasionIntelligenceContext) {
  const result = await generateWhatsappMessage('reminder', context)
  return result.text
}

export async function buildWhatsappRsvpReminder(context: OccasionIntelligenceContext) {
  const result = await generateWhatsappMessage('rsvp', context)
  return result.text
}

export async function buildWhatsappVendorCheckin(context: OccasionIntelligenceContext) {
  const result = await generateWhatsappMessage('vendor_checkin', context)
  return result.text
}

export function buildWhatsappShareUrl(message: string, targetUrl?: string) {
  const body = targetUrl ? `${message}\n\n${targetUrl}` : message
  return `https://wa.me/?text=${encodeURIComponent(body)}`
}
