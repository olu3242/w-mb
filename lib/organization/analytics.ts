export type OrganizationAnalytics = {
  activeEvents: number
  memberCount: number
  fundBalance: number
  announcementCount: number
}

export function buildOrganizationAiContext(input: OrganizationAnalytics) {
  return {
    engagement: input.memberCount > 0 ? 'active_member_base' : 'needs_member_setup',
    funding: input.fundBalance > 0 ? 'funds_available' : 'no_funds_yet',
    cadence: input.activeEvents > 1 ? 'multi_event_organization' : 'single_event_or_setup',
  }
}
