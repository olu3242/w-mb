import type { OccasionType } from '@/lib/occasion/occasion-types'

export type InvitationTemplateId =
  | 'luxe_wedding'
  | 'owambe_classic'
  | 'memorial_calm'
  | 'birthday_glow'
  | 'church_gathering'
  | 'community_support'
  | 'baby_soft'
  | 'custom_minimal'

export type InvitationTemplate = {
  id: InvitationTemplateId
  name: string
  description: string
  occasionTypes: OccasionType[]
  themeId: string
  palette: {
    background: string
    accent: string
    text: string
    muted: string
  }
}

export const INVITATION_TEMPLATES: InvitationTemplate[] = [
  {
    id: 'luxe_wedding',
    name: 'Luxe Wedding',
    description: 'Premium wording and polished details for wedding celebrations.',
    occasionTypes: ['wedding_owambe', 'anniversary'],
    themeId: 'gold_luxe',
    palette: { background: '#120d0a', accent: '#f3c76a', text: '#fff8eb', muted: '#d8c6aa' },
  },
  {
    id: 'owambe_classic',
    name: 'Owambe Classic',
    description: 'Warm, social, and celebratory for high-energy gatherings.',
    occasionTypes: ['wedding_owambe', 'birthday', 'naming_ceremony', 'graduation'],
    themeId: 'asoebi_joy',
    palette: { background: '#151111', accent: '#f97316', text: '#fff7ed', muted: '#fed7aa' },
  },
  {
    id: 'memorial_calm',
    name: 'Memorial Calm',
    description: 'Respectful remembrance wording for funeral and memorial services.',
    occasionTypes: ['funeral_memorial'],
    themeId: 'memorial_calm',
    palette: { background: '#101615', accent: '#a7c7b5', text: '#eef7f1', muted: '#b8c8be' },
  },
  {
    id: 'birthday_glow',
    name: 'Birthday Glow',
    description: 'Bright and inviting for birthday parties.',
    occasionTypes: ['birthday'],
    themeId: 'birthday_glow',
    palette: { background: '#190f18', accent: '#fb7185', text: '#fff1f2', muted: '#fecdd3' },
  },
  {
    id: 'church_gathering',
    name: 'Church Gathering',
    description: 'Graceful copy for church, fellowship, and community events.',
    occasionTypes: ['church_community'],
    themeId: 'church_gathering',
    palette: { background: '#0d1520', accent: '#7dd3fc', text: '#eff6ff', muted: '#bae6fd' },
  },
  {
    id: 'community_support',
    name: 'Community Support',
    description: 'Clear, caring language for support and emergency announcements.',
    occasionTypes: ['emergency_support', 'church_community', 'custom'],
    themeId: 'community_support',
    palette: { background: '#101214', accent: '#86efac', text: '#f0fdf4', muted: '#bbf7d0' },
  },
  {
    id: 'baby_soft',
    name: 'Baby Soft',
    description: 'Gentle invitation style for baby showers and naming ceremonies.',
    occasionTypes: ['baby_shower', 'naming_ceremony'],
    themeId: 'baby_soft',
    palette: { background: '#111827', accent: '#f9a8d4', text: '#fdf2f8', muted: '#fbcfe8' },
  },
  {
    id: 'custom_minimal',
    name: 'Custom Minimal',
    description: 'A clean, flexible invitation for any occasion.',
    occasionTypes: ['custom', 'graduation', 'anniversary', 'birthday'],
    themeId: 'custom_minimal',
    palette: { background: '#0a0a0a', accent: '#e5e7eb', text: '#fafafa', muted: '#a3a3a3' },
  },
]

export function getTemplatesForOccasion(occasionType: OccasionType | string | null | undefined) {
  const normalized = (occasionType ?? 'custom') as OccasionType
  const matches = INVITATION_TEMPLATES.filter(template => template.occasionTypes.includes(normalized))
  return matches.length ? matches : INVITATION_TEMPLATES.filter(template => template.id === 'custom_minimal')
}

export function getInvitationTemplate(templateId?: string | null) {
  return INVITATION_TEMPLATES.find(template => template.id === templateId) ?? INVITATION_TEMPLATES[0]
}
