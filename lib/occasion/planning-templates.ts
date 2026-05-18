import type { OccasionType } from './occasion-types'
import { getOccasionTheme } from './theme-config'

export type PlanningTemplate = {
  occasionType: OccasionType
  tone: string
  checklist: Array<{ title: string; description: string; priority?: 'low' | 'medium' | 'high'; dueOffsetDays?: number }>
  timeline: Array<{ title: string; description: string; milestoneType: string; dueOffsetDays?: number }>
  budgetCategories: string[]
  sponsorshipCategories: Array<{ name: string; description: string; targetAmount?: number }>
  vendorNeeds: string[]
  committeeRoles: Array<{ role: string; description: string }>
  memoryTributeSettings: {
    enabled: boolean
    tone: string
    prompts: string[]
  }
  defaultModules: string[]
  nextActions: string[]
}

const SHARED_BUFFER = 'Emergency buffer'

export const PLANNING_TEMPLATES: Record<OccasionType, PlanningTemplate> = {
  wedding_owambe: {
    occasionType: 'wedding_owambe',
    tone: 'vibrant, luxurious, and ceremonious',
    checklist: [
      { title: 'Confirm event date', description: 'Lock the date with key family and ceremony stakeholders.', priority: 'high', dueOffsetDays: -120 },
      { title: 'Set guest estimate', description: 'Create a working guest count for venue, food, and contribution planning.', priority: 'high', dueOffsetDays: -110 },
      { title: 'Shortlist venue', description: 'Compare capacity, parking, power, and location fit.', priority: 'high', dueOffsetDays: -100 },
      { title: 'Request catering quotes', description: 'Collect menu and service quotes based on guest tiers.', priority: 'medium', dueOffsetDays: -90 },
      { title: 'Choose MC/DJ', description: 'Confirm entertainment flow, introductions, and reception energy.', priority: 'medium', dueOffsetDays: -75 },
      { title: 'Plan asoebi/fashion needs', description: 'Coordinate colors, ordering windows, fittings, and family outfits.', priority: 'medium', dueOffsetDays: -70 },
      { title: 'Setup gift/contribution page', description: 'Open guest support categories and registry items.', priority: 'medium', dueOffsetDays: -60 },
    ],
    timeline: [
      { title: 'Planning kickoff', description: 'Confirm theme, planning leads, and first budget range.', milestoneType: 'kickoff', dueOffsetDays: -120 },
      { title: 'Vendor shortlist complete', description: 'Have venue, catering, decor, photo, and entertainment options ready.', milestoneType: 'vendor', dueOffsetDays: -75 },
      { title: 'Guest support page live', description: 'Publish contribution and gift options for guests.', milestoneType: 'contribution', dueOffsetDays: -60 },
      { title: 'Final vendor confirmations', description: 'Confirm balances, arrival windows, and day-of contacts.', milestoneType: 'execution', dueOffsetDays: -14 },
      { title: 'Event day run of show', description: 'Use the timeline to coordinate ceremony, reception, photos, and music.', milestoneType: 'event_day', dueOffsetDays: 0 },
    ],
    budgetCategories: ['Venue', 'Catering', 'Decoration', 'Photography', 'Music/Entertainment', 'Asoebi/Fashion', 'Logistics', SHARED_BUFFER],
    sponsorshipCategories: [
      { name: 'Gift support', description: 'Guest contributions toward the couple and household needs.' },
      { name: 'Catering support', description: 'Family or friends helping cover food and drinks.' },
      { name: 'Asoebi support', description: 'Fashion, fabric, styling, and coordinated looks.' },
    ],
    vendorNeeds: ['venue', 'caterer', 'decorator', 'photographer', 'videographer', 'MC', 'DJ/live band', 'makeup', 'fashion/tailor'],
    committeeRoles: [
      { role: 'Family coordinator', description: 'Keeps family decisions aligned and resolves planning blockers.' },
      { role: 'Vendor lead', description: 'Owns vendor follow-ups, deposits, arrival windows, and contacts.' },
      { role: 'Guest experience lead', description: 'Coordinates hospitality, seating, welcome, and guest support.' },
      { role: 'Finance lead', description: 'Tracks contributions, commitments, budget changes, and balances.' },
    ],
    memoryTributeSettings: {
      enabled: true,
      tone: 'celebratory',
      prompts: ['Share a favorite memory with the couple', 'Leave a blessing or prayer', 'Add a photo from the journey'],
    },
    defaultModules: ['Contributions & Registry', 'Vendor hub', 'Venue coordination', 'Task board', 'Timeline planning', 'Budget planning'],
    nextActions: ['Confirm the date and guest estimate', 'Shortlist two venue options', 'Open the contribution categories'],
  },
  funeral_memorial: {
    occasionType: 'funeral_memorial',
    tone: 'respectful, calm, and support-focused',
    checklist: [
      { title: 'Confirm family coordinator', description: 'Name one calm point person for decisions and communication.', priority: 'high', dueOffsetDays: -21 },
      { title: 'Confirm service date/location', description: 'Align family, officiant, venue, and service timing.', priority: 'high', dueOffsetDays: -18 },
      { title: 'Prepare obituary/program', description: 'Gather biography, photos, order of service, and acknowledgements.', priority: 'high', dueOffsetDays: -14 },
      { title: 'Coordinate transportation', description: 'Plan movement for family, guests, and service logistics.', priority: 'medium', dueOffsetDays: -10 },
      { title: 'Setup family support fund', description: 'Create a clear support category for family needs and welfare.', priority: 'medium', dueOffsetDays: -9 },
      { title: 'Open tribute wall', description: 'Invite memories, prayers, condolences, and photos.', priority: 'medium', dueOffsetDays: -7 },
      { title: 'Assign welfare committee', description: 'Coordinate meals, guest care, and family support with sensitivity.', priority: 'medium', dueOffsetDays: -7 },
    ],
    timeline: [
      { title: 'Family coordination started', description: 'Coordinator, immediate needs, and service direction confirmed.', milestoneType: 'support', dueOffsetDays: -21 },
      { title: 'Service plan confirmed', description: 'Date, location, officiant, and order of service aligned.', milestoneType: 'service', dueOffsetDays: -14 },
      { title: 'Tribute and program materials ready', description: 'Obituary, photos, tribute wall, and printing plan prepared.', milestoneType: 'tribute', dueOffsetDays: -5 },
      { title: 'Welfare logistics check', description: 'Transportation, food, ushers, and guest care reviewed.', milestoneType: 'welfare', dueOffsetDays: -2 },
      { title: 'Memorial service', description: 'Support the family with a calm, respectful service flow.', milestoneType: 'event_day', dueOffsetDays: 0 },
    ],
    budgetCategories: ['Funeral service', 'Program printing', 'Transportation', 'Food/welfare', 'Memorial venue', 'Family support', SHARED_BUFFER],
    sponsorshipCategories: [
      { name: 'Family support fund', description: 'Direct support for immediate family needs.' },
      { name: 'Food and welfare', description: 'Meals, water, guest care, and welfare logistics.' },
      { name: 'Program and tribute support', description: 'Printing, memorial materials, and remembrance items.' },
    ],
    vendorNeeds: ['funeral service', 'program printer', 'transportation', 'caterer', 'memorial venue', 'florist', 'photographer/videographer'],
    committeeRoles: [
      { role: 'Family coordinator', description: 'Keeps communication gentle, organized, and family-led.' },
      { role: 'Welfare lead', description: 'Coordinates meals, guest care, and family comfort.' },
      { role: 'Program lead', description: 'Collects obituary details, photos, tributes, and service materials.' },
      { role: 'Logistics lead', description: 'Manages transportation, venue readiness, and day-of movement.' },
    ],
    memoryTributeSettings: {
      enabled: true,
      tone: 'respectful',
      prompts: ['Share a memory with the family', 'Leave a condolence message', 'Add a photo in remembrance'],
    },
    defaultModules: ['Tribute wall', 'Family support fund', 'Guest communications', 'Task board', 'Timeline planning', 'Budget planning'],
    nextActions: ['Confirm the family coordinator', 'Set the service date and location', 'Open the tribute wall and support fund'],
  },
  birthday: buildGeneralTemplate('birthday', 'bright, playful, and personal', 'Birthday'),
  anniversary: buildGeneralTemplate('anniversary', 'romantic, warm, and elegant', 'Anniversary'),
  baby_shower: buildGeneralTemplate('baby_shower', 'gentle, cheerful, and welcoming', 'Baby Shower'),
  naming_ceremony: buildGeneralTemplate('naming_ceremony', 'honoring, joyful, and intimate', 'Naming Ceremony'),
  graduation: buildGeneralTemplate('graduation', 'proud, energetic, and celebratory', 'Graduation'),
  church_community: buildGeneralTemplate('church_community', 'uplifting, supportive, and organized', 'Church / Community'),
  emergency_support: {
    ...buildGeneralTemplate('emergency_support', 'calm, practical, and reassuring', 'Emergency Support'),
    budgetCategories: ['Immediate support', 'Transportation', 'Food support', 'Supplies', 'Communication', SHARED_BUFFER],
    sponsorshipCategories: [
      { name: 'Immediate support', description: 'Urgent help for the highest-priority need.' },
      { name: 'Meals and supplies', description: 'Practical food, water, household, or emergency items.' },
      { name: 'Transport support', description: 'Movement, logistics, and essential travel needs.' },
    ],
    nextActions: ['Confirm the immediate need', 'Assign a support coordinator', 'Open urgent support categories'],
  },
  custom: buildGeneralTemplate('custom', 'flexible, thoughtful, and adaptive', 'Custom Occasion'),
}

export function getPlanningTemplate(occasionType?: string | null): PlanningTemplate {
  const key = occasionType && occasionType in PLANNING_TEMPLATES ? (occasionType as OccasionType) : 'custom'
  const template = PLANNING_TEMPLATES[key]
  const theme = getOccasionTheme(key)

  return {
    ...template,
    defaultModules: Array.from(new Set([...template.defaultModules, ...theme.recommendedModules])),
  }
}

function buildGeneralTemplate(occasionType: OccasionType, tone: string, label: string): PlanningTemplate {
  const theme = getOccasionTheme(occasionType)

  return {
    occasionType,
    tone,
    checklist: [
      { title: 'Confirm event date', description: `Lock the ${label.toLowerCase()} date with key people.`, priority: 'high', dueOffsetDays: -60 },
      { title: 'Set guest estimate', description: 'Create a working guest count for venue, food, and budget planning.', priority: 'high', dueOffsetDays: -55 },
      { title: 'Shortlist venue', description: 'Compare capacity, location, cost, and guest comfort.', priority: 'medium', dueOffsetDays: -45 },
      { title: 'Create budget outline', description: 'Set starting budget categories and leave room for changes.', priority: 'medium', dueOffsetDays: -40 },
      { title: 'Confirm vendor needs', description: 'Decide which vendors or helpers are needed.', priority: 'medium', dueOffsetDays: -35 },
      { title: 'Setup contribution options', description: 'Open support categories that fit the occasion.', priority: 'low', dueOffsetDays: -30 },
    ],
    timeline: [
      { title: 'Planning kickoff', description: 'Confirm goals, budget range, and planning leads.', milestoneType: 'kickoff', dueOffsetDays: -60 },
      { title: 'Venue and vendor shortlist', description: 'Collect options and compare fit.', milestoneType: 'vendor', dueOffsetDays: -35 },
      { title: 'Guest page ready', description: 'Publish the guest-facing page and contribution options.', milestoneType: 'guest', dueOffsetDays: -21 },
      { title: 'Final logistics check', description: 'Review arrivals, payments, supplies, and day-of roles.', milestoneType: 'execution', dueOffsetDays: -3 },
      { title: 'Event day', description: `Run the ${label.toLowerCase()} with the prepared plan.`, milestoneType: 'event_day', dueOffsetDays: 0 },
    ],
    budgetCategories: [...theme.suggestedBudgetCategories, 'Logistics', SHARED_BUFFER],
    sponsorshipCategories: [
      { name: 'General support', description: `Support the ${label.toLowerCase()} and core planning needs.` },
      { name: 'Food and hospitality', description: 'Help cover guest meals, drinks, and hospitality.' },
      { name: 'Memories and media', description: 'Support photos, video, keepsakes, or memory collection.' },
    ],
    vendorNeeds: theme.suggestedVendorCategories.map(category => category.toLowerCase()),
    committeeRoles: [
      { role: 'Event lead', description: 'Owns decisions, planning rhythm, and final approvals.' },
      { role: 'Vendor lead', description: 'Coordinates vendors, helpers, quotes, and arrival details.' },
      { role: 'Guest lead', description: 'Manages invitations, questions, and hospitality.' },
      { role: 'Finance lead', description: 'Tracks budget categories, contributions, and commitments.' },
    ],
    memoryTributeSettings: {
      enabled: true,
      tone: 'personal',
      prompts: ['Share a favorite memory', 'Leave a note for the host', 'Add a photo from the celebration'],
    },
    defaultModules: theme.recommendedModules,
    nextActions: ['Confirm the date and guest estimate', 'Pick the first three budget categories', 'Invite one planning helper'],
  }
}
