import type { OccasionType } from './occasion-types'

export type OccasionTheme = {
  id: OccasionType
  label: string
  description: string
  emotionalTone: string
  typography?: string
  onboardingCopy?: string
  primaryColor: string
  accentColor: string
  cardBorder: string
  bgClass: string
  ctaCopy: string
  aiIntroCopy: string
  recommendedModules: string[]
  suggestedVendorCategories: string[]
  suggestedBudgetCategories: string[]
}

export const OCCASION_THEME_CONFIG: Record<OccasionType, OccasionTheme> = {
  wedding_owambe: {
    id: 'wedding_owambe',
    label: 'Wedding / Òwàmbẹ̀',
    description: 'Premium celebration planning with vendor, registry, and hospitality guidance.',
    emotionalTone: 'Vibrant, luxurious, and ceremonious',
    primaryColor: 'text-rose-400',
    accentColor: 'bg-rose-600',
    cardBorder: 'border-rose-500/20',
    bgClass: 'bg-rose-600/10',
    ctaCopy: 'Launch wedding planning',
    aiIntroCopy:
      'Let’s build your premium wedding or Òwàmbẹ̀ celebration with elegant vendor support, memorable contributions, and luxurious hospitality details.',
    recommendedModules: [
      'Contributions & Registry',
      'Vendor hub',
      'Venue coordination',
      'Task board',
      'Timeline planning',
    ],
    suggestedVendorCategories: ['Catering', 'Photography', 'Décor', 'Music', 'Venue'],
    suggestedBudgetCategories: ['Food & Drink', 'Venue', 'Décor', 'Entertainment', 'Guest Services'],
  },
  funeral_memorial: {
    id: 'funeral_memorial',
    label: 'Funeral / Memorial',
    description: 'Respectful remembrance planning with calm support and thoughtful ceremony tools.',
    emotionalTone: 'Calm, respectful, and supportive',
    primaryColor: 'text-slate-300',
    accentColor: 'bg-slate-500',
    cardBorder: 'border-slate-500/20',
    bgClass: 'bg-slate-700/10',
    ctaCopy: 'Begin memorial planning',
    aiIntroCopy:
      'We will create a respectful memorial flow with calm support, gentle ceremony guidance, and quiet coordination tools.',
    recommendedModules: [
      'Venue support',
      'Guest communications',
      'Remembrance notes',
      'Task board',
    ],
    suggestedVendorCategories: ['Funeral service', 'Catering', 'Flowers', 'Transportation'],
    suggestedBudgetCategories: ['Service fees', 'Flowers & Tributes', 'Meals', 'Transport'],
  },
  birthday: {
    id: 'birthday',
    label: 'Birthday',
    description: 'Joyful gathering planning with fun themes, gifts, and guest engagement.',
    emotionalTone: 'Bright, playful, and personal',
    primaryColor: 'text-fuchsia-400',
    accentColor: 'bg-fuchsia-600',
    cardBorder: 'border-fuchsia-500/20',
    bgClass: 'bg-fuchsia-600/10',
    ctaCopy: 'Start birthday planning',
    aiIntroCopy:
      'Create a joyful birthday celebration with bright activities, gift registry ideas, and guest engagement planning.',
    recommendedModules: ['Gift registry', 'Venue coordination', 'Entertainment planning', 'Task board'],
    suggestedVendorCategories: ['Cake', 'Entertainment', 'Catering', 'Photography'],
    suggestedBudgetCategories: ['Food & Drink', 'Entertainment', 'Gifts', 'Decor'],
  },
  anniversary: {
    id: 'anniversary',
    label: 'Anniversary',
    description: 'Warm celebration planning for love, milestones, and intimate gatherings.',
    emotionalTone: 'Romantic, warm, and elegant',
    primaryColor: 'text-amber-300',
    accentColor: 'bg-amber-500',
    cardBorder: 'border-amber-500/20',
    bgClass: 'bg-amber-500/10',
    ctaCopy: 'Begin anniversary planning',
    aiIntroCopy:
      'Plan a meaningful anniversary celebration with romantic touches, milestone details, and guest experience suggestions.',
    recommendedModules: ['Venue coordination', 'Guest communications', 'Task board', 'Budget planning'],
    suggestedVendorCategories: ['Catering', 'Music', 'Décor', 'Photography'],
    suggestedBudgetCategories: ['Food & Drink', 'Ambiance', 'Guest gifts', 'Entertainment'],
  },
  baby_shower: {
    id: 'baby_shower',
    label: 'Baby Shower',
    description: 'Tender celebration planning for new parents, gifts, and joyful gatherings.',
    emotionalTone: 'Gentle, cheerful, and welcoming',
    primaryColor: 'text-cyan-300',
    accentColor: 'bg-cyan-500',
    cardBorder: 'border-cyan-500/20',
    bgClass: 'bg-cyan-500/10',
    ctaCopy: 'Start baby shower planning',
    aiIntroCopy:
      'Let’s plan a warm baby shower filled with thoughtful gifts, joyful details, and guest comfort.',
    recommendedModules: ['Gift registry', 'Guest communications', 'Venue coordination', 'Task board'],
    suggestedVendorCategories: ['Catering', 'Decor', 'Photography', 'Gifts'],
    suggestedBudgetCategories: ['Gifts', 'Food & Drink', 'Decor', 'Entertainment'],
  },
  naming_ceremony: {
    id: 'naming_ceremony',
    label: 'Naming Ceremony',
    description: 'Special naming ceremony planning for family, tradition, and celebration.',
    emotionalTone: 'Honoring, joyful, and intimate',
    primaryColor: 'text-emerald-300',
    accentColor: 'bg-emerald-500',
    cardBorder: 'border-emerald-500/20',
    bgClass: 'bg-emerald-500/10',
    ctaCopy: 'Start naming ceremony planning',
    aiIntroCopy:
      'We’ll help you shape a meaningful naming ceremony with family-focused traditions and elegant coordination.',
    recommendedModules: ['Guest communications', 'Venue coordination', 'Task board', 'Budget planning'],
    suggestedVendorCategories: ['Catering', 'Photography', 'Music', 'Décor'],
    suggestedBudgetCategories: ['Ceremony costs', 'Meals', 'Gifts', 'Venue'],
  },
  graduation: {
    id: 'graduation',
    label: 'Graduation',
    description: 'Achievement celebration planning with pomp, guest lists, and après-party ideas.',
    emotionalTone: 'Proud, energetic, and celebratory',
    primaryColor: 'text-sky-300',
    accentColor: 'bg-sky-600',
    cardBorder: 'border-sky-500/20',
    bgClass: 'bg-sky-600/10',
    ctaCopy: 'Begin graduation planning',
    aiIntroCopy:
      'Plan a proud graduation celebration with recognition moments, guest support, and fun event flow.',
    recommendedModules: ['Guest communications', 'Venue coordination', 'Entertainment planning', 'Task board'],
    suggestedVendorCategories: ['Catering', 'Photography', 'Music', 'Decor'],
    suggestedBudgetCategories: ['Food & Drink', 'Awards', 'Decor', 'Entertainment'],
  },
  church_community: {
    id: 'church_community',
    label: 'Church / Community',
    description: 'Purposeful community or church gathering planning with inclusive coordination.',
    emotionalTone: 'Uplifting, supportive, and organized',
    primaryColor: 'text-violet-300',
    accentColor: 'bg-violet-600',
    cardBorder: 'border-violet-500/20',
    bgClass: 'bg-violet-600/10',
    ctaCopy: 'Start community planning',
    aiIntroCopy:
      'Build a meaningful church or community gathering with thoughtful support, clear coordination, and inclusive planning.',
    recommendedModules: ['Guest communications', 'Venue coordination', 'Task board', 'Budget planning'],
    suggestedVendorCategories: ['Catering', 'Audio/Visual', 'Decor', 'Volunteer support'],
    suggestedBudgetCategories: ['Venue', 'Meals', 'Supplies', 'Program'],
  },
  emergency_support: {
    id: 'emergency_support',
    label: 'Emergency Support',
    description: 'Urgent support planning with practical coordination and calm assistance.',
    emotionalTone: 'Calm, practical, and reassuring',
    primaryColor: 'text-amber-200',
    accentColor: 'bg-amber-600',
    cardBorder: 'border-amber-500/20',
    bgClass: 'bg-amber-600/10',
    ctaCopy: 'Begin emergency support planning',
    aiIntroCopy:
      'Set up a calm emergency support plan with practical coordination, assistance tracking, and reassuring communication.',
    recommendedModules: ['Guest communications', 'Task board', 'Venue support', 'Budget planning'],
    suggestedVendorCategories: ['Catering', 'Logistics', 'Transport', 'Support services'],
    suggestedBudgetCategories: ['Emergency logistics', 'Food support', 'Transport', 'Supplies'],
  },
  custom: {
    id: 'custom',
    label: 'Custom Occasion',
    description: 'Create a custom occasion with flexible planning and adaptable support.',
    emotionalTone: 'Flexible, thoughtful, and adaptive',
    primaryColor: 'text-pulse',
    accentColor: 'bg-pulse',
    cardBorder: 'border-pulse/20',
    bgClass: 'bg-pulse/10',
    ctaCopy: 'Start custom planning',
    aiIntroCopy:
      'Craft a custom occasion with adaptable planning, personalized recommendations, and a flexible event flow.',
    recommendedModules: ['Venue coordination', 'Task board', 'Budget planning', 'Guest communications'],
    suggestedVendorCategories: ['Catering', 'Décor', 'Entertainment', 'Logistics'],
    suggestedBudgetCategories: ['Venue', 'Food & Drink', 'Decor', 'Services'],
  },
}

export const OCCASION_THEME_OPTIONS = Object.values(OCCASION_THEME_CONFIG)

export function getOccasionTheme(occasion: OccasionType) {
  return OCCASION_THEME_CONFIG[occasion]
}
