export type EventSignals = {
  has_contributions?: boolean
  has_venue?: boolean
  has_vendors?: boolean
  has_tasks?: boolean
  has_timeline?: boolean
  has_budget_profile?: boolean
  alice_calibrated?: boolean
  alice_budget_generated?: boolean
  [key: string]: boolean | undefined
}

export type Event = {
  id: string
  slug: string
  title: string
  description?: string
  event_date?: string
  location?: string
  is_public: boolean
  occasion_type?: string | null
  theme_id?: string | null
  emotional_mode?: string | null
  ai_plan_seed?: Record<string, unknown> | null
  modules?: string[] | null
  signals: EventSignals
  currency?: string
  timezone?: string
  locale?: string
  country?: string | null
  diaspora_hub?: string | null
  owner_id: string
  stripe_account_id?: string
  alice_unlocked: boolean
  alice_paid_at?: string
  alice_payment_ref?: string
  created_at: string
  updated_at: string
}

export type GiftItem = {
  id: string
  event_id: string
  title: string
  description?: string
  amount: number
  is_funded: boolean
  created_at: string
}

export type Contribution = {
  id: string
  event_id: string
  gift_item_id?: string
  amount: number
  contributor_name: string
  contributor_email: string
  message?: string
  stripe_payment_intent_id: string
  status: 'pending' | 'succeeded' | 'failed'
  created_at: string
}

export type Task = {
  id: string
  event_id: string
  title: string
  assigned_to?: string
  due_date?: string
  status: 'todo' | 'in_progress' | 'done'
  created_at: string
}

export type Vendor = {
  id: string
  event_id: string
  name: string
  category: string
  contact?: string
  cost?: number
  status: 'prospect' | 'booked' | 'paid'
  created_at: string
}

export type BudgetLine = {
  id: string
  event_id: string
  category: string
  label: string
  estimated: number
  actual?: number
  created_at: string
}

export type LocationArea = 'premium' | 'urban' | 'state_capital' | 'other'
export type EventType = 'wedding' | 'funeral' | 'birthday' | 'corporate' | 'naming' | 'party'

export type EventContext = {
  id: string
  event_id: string
  guest_count: number
  style_tier: 'intimate' | 'standard' | 'premium' | 'luxury'
  location_type: 'indoor' | 'outdoor' | 'hybrid'
  location_area: LocationArea
  event_type: EventType
  face_priority: boolean
  hero_element: string
  budget_ceiling?: number | null
  event_month?: number | null
  event_dow?: number | null
  raw_notes?: string | null
  created_at: string
  updated_at: string
}

export type EventFacets = {
  id: string
  event_id: string
  context_id?: string | null
  raw_total: number
  final_total: number
  demand_multiplier: number
  area_multiplier?: number | null
  inflation_buffer?: number | null
  allocations: Record<string, number>
  ave_data: Record<string, { allocated: number; actual: number }>
  generated_at: string
}

export type AliceAlert = {
  id: string
  event_id: string
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  resolved: boolean
  created_at: string
}

export type AliceDecision = {
  id: string
  event_id: string
  decision_type: string
  payload: Record<string, unknown>
  accepted?: boolean | null
  created_at: string
}

export type VendorInvite = {
  id: string
  event_id: string
  vendor_id?: string | null
  email: string
  name?: string | null
  status: 'pending' | 'accepted' | 'declined'
  token: string
  created_at: string
}

export type VendorScore = {
  id: string
  vendor_id: string
  event_id: string
  punctuality_score: number
  quality_score: number
  reliability_score: number
  notes?: string | null
  created_at: string
}

export type ClientPreference = {
  id: string
  owner_id: string
  face_priority: boolean
  disliked_categories: string[]
  budget_style: 'tight' | 'balanced' | 'lavish'
  created_at: string
  updated_at: string
}

export type EventInventory = {
  id: string
  event_id: string
  item_name: string
  facet: string
  total_qty: number
  store_qty: number
  floor_qty: number
  unit_cost_kobo: number
  created_at: string
  updated_at: string
}

export type VendorCrew = {
  id: string
  event_id: string
  vendor_id?: string | null
  crew_name: string
  plate_number?: string | null
  crew_id_verified: boolean
  fuel_audited: boolean
  high_scrutiny: boolean
  created_at: string
}

export type GuestExperienceScore = {
  id: string
  event_id: string
  ac_score?: number | null
  service_speed_score?: number | null
  bathroom_score?: number | null
  overall_score?: number | null
  notes?: string | null
  created_at: string
}
