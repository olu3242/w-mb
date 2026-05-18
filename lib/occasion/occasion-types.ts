export const OCCASION_TYPES = [
  'wedding_owambe',
  'funeral_memorial',
  'birthday',
  'anniversary',
  'baby_shower',
  'naming_ceremony',
  'graduation',
  'church_community',
  'emergency_support',
  'custom',
] as const

export type OccasionType = (typeof OCCASION_TYPES)[number]
