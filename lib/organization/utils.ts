import { generateSlug } from '@/lib/utils'

export function generateOrganizationSlug(name: string) {
  return generateSlug(name)
}

export const ORGANIZATION_TYPES = [
  'church',
  'mosque',
  'alumni_association',
  'cultural_association',
  'welfare_group',
  'extended_family_house',
  'nonprofit',
  'community_organization',
  'social_club',
] as const

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]
