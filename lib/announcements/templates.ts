export const ANNOUNCEMENT_TYPES = [
  'venue_change',
  'time_change',
  'dress_code_update',
  'contribution_reminder',
  'rsvp_reminder',
  'vendor_logistics_update',
  'funeral_service_update',
  'memorial_livestream_info',
  'parking_transport_update',
  'weather_emergency_notice',
  'thank_you_message',
  'memory_upload_request',
  'custom',
] as const

export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number]

export type AnnouncementCopyInput = {
  eventName: string
  title: string
  body: string
  announcementType?: string | null
  link?: string | null
}

export function generateAnnouncementBody(type: AnnouncementType, eventName: string) {
  switch (type) {
    case 'venue_change':
      return `Venue update for ${eventName}: please review the latest address before leaving.`
    case 'time_change':
      return `Time update for ${eventName}: please note the revised schedule and plan arrival accordingly.`
    case 'dress_code_update':
      return `Dress code update for ${eventName}: please review the latest attire guidance from the hosts.`
    case 'contribution_reminder':
      return `Support reminder for ${eventName}: contribution details are available on the event page.`
    case 'rsvp_reminder':
      return `RSVP reminder for ${eventName}: kindly confirm attendance so the hosts can plan properly.`
    case 'funeral_service_update':
      return `Service update for ${eventName}: please review the latest funeral or memorial details with care.`
    case 'memorial_livestream_info':
      return `Livestream information for ${eventName}: remote attendance details are now available.`
    case 'parking_transport_update':
      return `Parking and transport update for ${eventName}: please review arrival guidance before the event.`
    case 'weather_emergency_notice':
      return `Important notice for ${eventName}: please check the latest safety or weather guidance.`
    case 'thank_you_message':
      return `Thank you from the hosts of ${eventName}. Your presence and support are deeply appreciated.`
    case 'memory_upload_request':
      return `Memory request for ${eventName}: please share photos, notes, prayers, or memories on the event page.`
    case 'vendor_logistics_update':
      return `Logistics update for ${eventName}: vendors and committee members should review the latest instructions.`
    default:
      return `Update for ${eventName}: please review the latest information from the hosts.`
  }
}

export function generateAnnouncementShareCopy(input: AnnouncementCopyInput) {
  const shortBody = input.body.length > 180 ? `${input.body.slice(0, 177).trim()}...` : input.body
  return [`Update for ${input.eventName}: ${input.title}`, shortBody, input.link].filter(Boolean).join(' - ')
}

export function buildAnnouncementWhatsappUrl(input: AnnouncementCopyInput) {
  return `https://wa.me/?text=${encodeURIComponent(generateAnnouncementShareCopy(input))}`
}
