import type { OccasionType } from '@/lib/occasion/occasion-types'

export const GALLERY_SECTION_TYPES = ['pre_party', 'main_event', 'post_party', 'custom'] as const
export const GALLERY_VISIBILITIES = ['public', 'guests_only', 'committee_only', 'private'] as const
export const GALLERY_MEDIA_TYPES = ['image', 'video'] as const
export const GALLERY_MODERATION_STATUSES = ['pending', 'approved', 'rejected'] as const

export type GallerySectionType = (typeof GALLERY_SECTION_TYPES)[number]
export type GalleryVisibility = (typeof GALLERY_VISIBILITIES)[number]
export type GalleryMediaType = (typeof GALLERY_MEDIA_TYPES)[number]
export type GalleryModerationStatus = (typeof GALLERY_MODERATION_STATUSES)[number]

export type GallerySectionPreset = {
  sectionType: GallerySectionType
  title: string
  description: string
}

export function getGallerySectionPresets(occasionType?: OccasionType | string | null): GallerySectionPreset[] {
  if (occasionType === 'funeral_memorial') {
    return [
      {
        sectionType: 'pre_party',
        title: 'Before the Service',
        description: 'Preparation, family gathering, and quiet remembrance moments before the service.',
      },
      {
        sectionType: 'main_event',
        title: 'Memorial Service',
        description: 'Approved photos and video from the service or remembrance gathering.',
      },
      {
        sectionType: 'post_party',
        title: 'Memories & Tributes',
        description: 'Shared memories, tributes, and family recap moments.',
      },
    ]
  }

  return [
    {
      sectionType: 'pre_party',
      title: 'Pre-Party',
      description: 'Engagement shoots, showers, planning moments, preparation photos, and vendor setup.',
    },
    {
      sectionType: 'main_event',
      title: 'Main Celebration',
      description: 'Ceremony, reception, birthday, church/community, or official event highlights.',
    },
    {
      sectionType: 'post_party',
      title: 'After-Party',
      description: 'After-party moments, thank-you memories, family recap, and guest uploads.',
    },
  ]
}

export function getGalleryShareCopy(input: {
  eventName: string
  link: string
  occasionType?: OccasionType | string | null
  sectionType?: GallerySectionType | string | null
}) {
  if (input.occasionType === 'funeral_memorial') {
    return `Share a memory or tribute for ${input.eventName} here: ${input.link}`
  }

  if (input.sectionType === 'post_party') {
    return `Keep the celebration going - upload your after-party memories here: ${input.link}`
  }

  return `Photos from ${input.eventName} are now live. View and add your memories here: ${input.link}`
}

export function getGalleryWhatsappUrl(copy: string) {
  return `https://wa.me/?text=${encodeURIComponent(copy)}`
}

export function getMediaTypeFromMime(type: string): GalleryMediaType | null {
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  return null
}
