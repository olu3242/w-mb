'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export async function saveAiMemorySnapshot(formData: FormData) {
  const occasionId = String(formData.get('occasion_id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const summary = String(formData.get('summary') ?? 'Owambe AI operations snapshot')
  const healthScore = Number(formData.get('health_score') ?? 0)
  const recommendations = String(formData.get('recommendations') ?? '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
  const topRisks = String(formData.get('top_risks') ?? '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)

  if (!occasionId) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const payload = {
    occasionId,
    generatedAt: new Date().toISOString(),
    summary,
    recommendations,
    healthScore,
    topRisks,
    source: 'dashboard_action',
  }

  await supabase.from('ai_memory_snapshots').insert({
    occasion_id: occasionId,
    memory_type: 'event_snapshot',
    summary,
    payload: payload as Json,
    created_by: user.id,
  })

  await supabase.from('orchestration_logs').insert({
    occasion_id: occasionId,
    source: 'ai_assistant',
    level: topRisks.length ? 'warning' : 'info',
    message: `Saved AI memory snapshot for ${summary}`,
    metadata: { healthScore, recommendationCount: recommendations.length } as Json,
  })

  if (slug) revalidatePath(`/events/${slug}`)
}
