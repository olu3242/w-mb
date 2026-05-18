import type { OccasionType } from '@/lib/occasion/occasion-types'
import { getInvitationTemplate } from './templates'

export type InvitationCopyInput = {
  occasionType?: OccasionType | string | null
  tone?: string | null
  eventName: string
  dateTime?: string | null
  location?: string | null
  hostNames?: string | null
  rsvpLink?: string | null
  contributionLink?: string | null
  templateId?: string | null
}

export type InvitationCopy = {
  headline: string
  subtitle: string
  body: string
  rsvpCopy: string
  supportCopy: string
  whatsappCopy: string
}

function formatWhen(value?: string | null) {
  if (!value) return 'the event date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
}

function compact(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function generateInvitationCopy(input: InvitationCopyInput): InvitationCopy {
  const occasionType = input.occasionType ?? 'custom'
  const eventName = input.eventName || 'this occasion'
  const when = formatWhen(input.dateTime)
  const where = input.location || 'the venue'
  const host = input.hostNames || 'the hosts'
  const rsvpLink = input.rsvpLink || ''
  const contributionLink = input.contributionLink || ''
  const template = getInvitationTemplate(input.templateId)

  if (occasionType === 'funeral_memorial') {
    const headline = `In Loving Memory: ${eventName}`
    const body = compact([
      `With respect and love, ${host} invite you to join us for a remembrance service for ${eventName}.`,
      `The service will take place on ${when} at ${where}.`,
      'Your presence, prayers, and support are deeply appreciated.',
    ])
    const rsvpCopy = rsvpLink ? `Kindly confirm attendance here: ${rsvpLink}` : 'Kindly confirm attendance with the family.'
    const supportCopy = contributionLink ? `Family support details: ${contributionLink}` : 'Support details may be shared by the family.'
    return {
      headline,
      subtitle: 'A remembrance and service announcement',
      body,
      rsvpCopy,
      supportCopy,
      whatsappCopy: compact([
        `With respect and love, we invite you to join us for the remembrance of ${eventName}.`,
        `Details: ${rsvpLink || contributionLink || where}`,
      ]),
    }
  }

  if (occasionType === 'wedding_owambe') {
    const headline = `You're Invited to ${eventName}`
    const body = compact([
      `${host} warmly invite you to a premium celebration filled with love, family, music, and unforgettable Owambe energy.`,
      `Join us on ${when} at ${where}.`,
    ])
    const rsvpCopy = rsvpLink ? `Reserve your place here: ${rsvpLink}` : 'Please RSVP with the hosts.'
    const supportCopy = contributionLink ? `Support or gift the couple here: ${contributionLink}` : 'Your presence is the finest gift.'
    return {
      headline,
      subtitle: `${template.name} celebration`,
      body,
      rsvpCopy,
      supportCopy,
      whatsappCopy: compact([`You're invited to ${eventName}.`, `Join us on ${when} at ${where}.`, rsvpLink ? `RSVP here: ${rsvpLink}` : null]),
    }
  }

  if (occasionType === 'emergency_support') {
    const headline = `Support Needed: ${eventName}`
    const body = compact([
      `${host} are coordinating support for ${eventName}.`,
      `Please review the details and share with trusted family, friends, and community members.`,
    ])
    return {
      headline,
      subtitle: 'Community support announcement',
      body,
      rsvpCopy: rsvpLink ? `Updates and response details: ${rsvpLink}` : 'Please contact the organizer for response details.',
      supportCopy: contributionLink ? `Contribute support here: ${contributionLink}` : 'Support instructions will be shared by the organizer.',
      whatsappCopy: compact([`Support update for ${eventName}.`, contributionLink ? `Contribute here: ${contributionLink}` : rsvpLink ? `Details: ${rsvpLink}` : null]),
    }
  }

  const headline = `You're Invited to ${eventName}`
  const body = compact([
    `${host} invite you to join us for ${eventName}.`,
    `We gather on ${when} at ${where}.`,
    input.tone ? `The tone is ${input.tone}.` : null,
  ])

  return {
    headline,
    subtitle: `${template.name} invitation`,
    body,
    rsvpCopy: rsvpLink ? `RSVP here: ${rsvpLink}` : 'Please RSVP with the host.',
    supportCopy: contributionLink ? `Support the occasion here: ${contributionLink}` : 'Support details may be shared by the host.',
    whatsappCopy: compact([`You're invited to ${eventName}.`, `Join us on ${when} at ${where}.`, rsvpLink ? `RSVP here: ${rsvpLink}` : null]),
  }
}

export function buildWhatsappShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
