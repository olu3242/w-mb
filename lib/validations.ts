import { z } from 'zod'
import { OCCASION_TYPES } from '@/lib/occasion/occasion-types'

export const EventSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  event_date: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  is_public: z.boolean().default(true),
  occasion_type: z.enum(OCCASION_TYPES).optional(),
  theme_id: z.string().optional(),
  emotional_mode: z.string().optional(),
  ai_plan_seed: z.record(z.any()).optional(),
  modules: z.array(z.string()).optional(),
})

export const ContributionSchema = z.object({
  event_id: z.string().uuid(),
  gift_item_id: z.string().uuid().optional(),
  amount: z.number().int().min(100),
  contributor_name: z.string().min(1).max(100),
  contributor_email: z.string().email(),
  message: z.string().max(500).optional(),
})

export type EventInput = z.infer<typeof EventSchema>
export type ContributionInput = z.infer<typeof ContributionSchema>
