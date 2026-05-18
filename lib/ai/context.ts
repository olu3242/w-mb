import type { OccasionType } from '@/lib/occasion/occasion-types'

export type Task = {
  id: string
  status: string
  due_at: string | null
  assigned_to: string | null
  priority?: string
}

export type TimelineItem = {
  id: string
  status: string
  due_at: string | null
  milestone_type: string
}

export type BudgetCategory = {
  id: string
  estimated_amount: number
  actual_amount: number
}

export type SponsorshipCategory = {
  id: string
  name: string
  target_amount: number
  funded_amount: number
  status: string
}

export type Contribution = {
  id: string
  amount: number
  status: string
  currency?: string | null
}

export type VendorNeed = {
  id: string
  category: string
  status: string
}

export type VendorInquiry = {
  id: string
  status: string
}

export type GuestSummary = {
  id: string
  status: string
  guest_count: number
}

export type CommitteeRole = {
  id: string
  assigned_to: string | null
  role: string
}

export type OccasionIntelligenceContext = {
  occasionId: string
  occasionType: OccasionType
  title?: string
  eventDate?: string | null
  location?: string | null
  timezone?: string | null
  locale?: string | null
  country?: string | null
  eventCurrency?: string | null
  diasporaHub?: string | null
  isPublic?: boolean
  signals: Record<string, boolean | undefined>
  metrics: {
    taskCount: number
    tasksOpen: number
    tasksCompleted: number
    tasksOverdue: number
    tasksUnassigned: number
    timelineCount: number
    timelineOpen: number
    timelineOverdue: number
    upcomingMilestones: number
    budgetCategories: number
    budgetOverruns: number
    fundingTarget: number
    fundedTotal: number
    fundingProgress: number
    contributionCount: number
    vendorNeeds: number
    vendorInquiryCount: number
    guestCount: number
    rsvpAccepted: number
    rsvpMaybe: number
    rsvpDeclined: number
    committeeRoles: number
    committeeAssignedRoles: number
    announcementsCount: number
    activityEventsCount: number
  }
  healthScore?: {
    overall: number
    topRisks: string[]
    topStrengths: string[]
  }
  tasks: Task[]
  timelineItems: TimelineItem[]
  budgetCategories: BudgetCategory[]
  sponsorshipCategories: SponsorshipCategory[]
  contributions: Contribution[]
  vendorNeeds: VendorNeed[]
  vendorInquiries: VendorInquiry[]
  guests: GuestSummary[]
  committeeRoles: CommitteeRole[]
  announcementsCount: number
  activityEventsCount: number
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

export function buildEventIntelligenceContext(params: {
  occasionId: string
  occasionType: OccasionType
  title?: string
  eventDate?: string | null
  location?: string | null
  timezone?: string | null
  locale?: string | null
  country?: string | null
  eventCurrency?: string | null
  diasporaHub?: string | null
  isPublic?: boolean
  signals?: Record<string, boolean | undefined>
  tasks?: Task[]
  timelineItems?: TimelineItem[]
  budgetCategories?: BudgetCategory[]
  sponsorshipCategories?: SponsorshipCategory[]
  contributions?: Contribution[]
  vendorNeeds?: VendorNeed[]
  vendorInquiries?: VendorInquiry[]
  guests?: GuestSummary[]
  committeeRoles?: CommitteeRole[]
  announcementsCount?: number
  activityEventsCount?: number
}): OccasionIntelligenceContext {
  const tasks = params.tasks ?? []
  const timelineItems = params.timelineItems ?? []
  const budgetCategories = params.budgetCategories ?? []
  const sponsorshipCategories = params.sponsorshipCategories ?? []
  const contributions = params.contributions ?? []
  const vendorNeeds = params.vendorNeeds ?? []
  const vendorInquiries = params.vendorInquiries ?? []
  const guests = params.guests ?? []
  const committeeRoles = params.committeeRoles ?? []
  const today = new Date()

  const tasksCompleted = tasks.filter(task => task.status === 'done').length
  const tasksOpen = tasks.length - tasksCompleted
  const tasksOverdue = tasks.filter(task => {
    const dueDate = parseDate(task.due_at)
    return task.status !== 'done' && dueDate !== null && dueDate < today
  }).length
  const tasksUnassigned = tasks.filter(task => task.status !== 'done' && !task.assigned_to).length

  const timelineOverdue = timelineItems.filter(item => {
    const dueDate = parseDate(item.due_at)
    return item.status !== 'done' && dueDate !== null && dueDate < today
  }).length
  const upcomingMilestones = timelineItems.filter(item => {
    const dueDate = parseDate(item.due_at)
    if (!dueDate) return false
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return item.status !== 'done' && diffDays >= 0 && diffDays <= 14
  }).length

  const budgetOverruns = budgetCategories.filter(category => category.actual_amount > category.estimated_amount).length
  const fundedTotal = sponsorshipCategories.reduce((sum, category) => sum + Number(category.funded_amount ?? 0), 0)
  const fundingTarget = sponsorshipCategories.reduce((sum, category) => sum + Number(category.target_amount ?? 0), 0)
  const fundingProgress = fundingTarget > 0 ? Math.min(100, Math.round((fundedTotal / fundingTarget) * 100)) : 100

  const rsvpAccepted = guests.filter(guest => guest.status === 'accepted').reduce((sum, item) => sum + item.guest_count, 0)
  const rsvpMaybe = guests.filter(guest => guest.status === 'maybe').length
  const rsvpDeclined = guests.filter(guest => guest.status === 'declined').length

  const committeeAssignedRoles = committeeRoles.filter(role => Boolean(role.assigned_to)).length
  const overallHealth = Math.max(0, Math.min(100, 100 - tasksOverdue * 8 - timelineOverdue * 8 - budgetOverruns * 10))

  return {
    occasionId: params.occasionId,
    occasionType: params.occasionType,
    title: params.title,
    eventDate: params.eventDate,
    location: params.location,
    timezone: params.timezone ?? 'UTC',
    locale: params.locale ?? 'en-US',
    country: params.country,
    eventCurrency: params.eventCurrency ?? 'USD',
    diasporaHub: params.diasporaHub,
    isPublic: params.isPublic,
    signals: params.signals ?? {},
    metrics: {
      taskCount: tasks.length,
      tasksOpen,
      tasksCompleted,
      tasksOverdue,
      tasksUnassigned,
      timelineCount: timelineItems.length,
      timelineOpen: timelineItems.filter(item => item.status !== 'done').length,
      timelineOverdue,
      upcomingMilestones,
      budgetCategories: budgetCategories.length,
      budgetOverruns,
      fundingTarget,
      fundedTotal,
      fundingProgress,
      contributionCount: contributions.length,
      vendorNeeds: vendorNeeds.length,
      vendorInquiryCount: vendorInquiries.length,
      guestCount: guests.length,
      rsvpAccepted,
      rsvpMaybe,
      rsvpDeclined,
      committeeRoles: committeeRoles.length,
      committeeAssignedRoles,
      announcementsCount: params.announcementsCount ?? 0,
      activityEventsCount: params.activityEventsCount ?? 0,
    },
    healthScore: {
      overall: overallHealth,
      topRisks: [
        ...(tasksOverdue > 0 ? ['Overdue tasks need attention'] : []),
        ...(timelineOverdue > 0 ? ['Timeline milestones are overdue'] : []),
        ...(budgetOverruns > 0 ? ['Budget categories are over actuals'] : []),
      ],
      topStrengths: [
        ...(tasksCompleted > 0 ? ['Tasks are moving'] : []),
        ...(fundingProgress > 0 ? ['Funding activity is visible'] : []),
        ...(rsvpAccepted > 0 ? ['Guests are responding'] : []),
      ],
    },
    tasks,
    timelineItems,
    budgetCategories,
    sponsorshipCategories,
    contributions,
    vendorNeeds,
    vendorInquiries,
    guests,
    committeeRoles,
    announcementsCount: params.announcementsCount ?? 0,
    activityEventsCount: params.activityEventsCount ?? 0,
  }
}
