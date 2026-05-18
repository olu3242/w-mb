import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import { getPlanningTemplate } from './planning-templates'

type EventForGeneration = {
  id: string
  event_date?: string | null
  occasion_type?: string | null
  owner_id: string
}

export async function generatePlanningWorkspace(
  supabase: SupabaseClient<Database, 'public'>,
  event: EventForGeneration,
) {
  const template = getPlanningTemplate(event.occasion_type)
  const dueDate = createDueDateFactory(event.event_date)

  const { count } = await supabase
    .from('event_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('occasion_id', event.id)

  if (count && count > 0) return

  const eventTasks = template.checklist.map(item => ({
    occasion_id: event.id,
    title: item.title,
    description: item.description,
    priority: item.priority ?? 'medium',
    due_at: dueDate(item.dueOffsetDays),
    created_by: event.owner_id,
  }))

  const timelineItems = template.timeline.map(item => ({
    occasion_id: event.id,
    title: item.title,
    description: item.description,
    milestone_type: item.milestoneType,
    due_at: dueDate(item.dueOffsetDays),
  }))

  await ensure(supabase.from('event_tasks').insert(eventTasks), 'event_tasks')
  await ensure(
    supabase.from('tasks').insert(
      eventTasks.map(task => ({
        event_id: event.id,
        title: task.title,
        assigned_to: null,
        due_date: task.due_at ? task.due_at.slice(0, 10) : null,
        status: 'todo',
      })),
    ),
    'tasks',
  )
  await ensure(supabase.from('event_timeline_items').insert(timelineItems), 'event_timeline_items')
  await ensure(
    supabase.from('timeline_items').insert(
      timelineItems.map((item, index) => ({
        event_id: event.id,
        scheduled_time: item.due_at ? new Date(item.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Step ${index + 1}`,
        title: item.title,
        responsible: null,
        status: 'pending',
        notes: item.description,
        sort_order: index + 1,
      })),
    ),
    'timeline_items',
  )
  await ensure(
    supabase.from('budget_categories').insert(
      template.budgetCategories.map((name, index) => ({
        occasion_id: event.id,
        name,
        sort_order: index + 1,
      })),
    ),
    'budget_categories',
  )
  await ensure(
    supabase.from('budget_lines').insert(
      template.budgetCategories.map(name => ({
        event_id: event.id,
        category: name,
        label: name,
        estimated: 0,
        actual: 0,
      })),
    ),
    'budget_lines',
  )
  await ensure(
    supabase.from('sponsorship_categories').insert(
      template.sponsorshipCategories.map(category => ({
        occasion_id: event.id,
        name: category.name,
        description: category.description,
        target_amount: category.targetAmount ?? 0,
      })),
    ),
    'sponsorship_categories',
  )
  await ensure(
    supabase.from('event_vendor_needs').insert(
      template.vendorNeeds.map((category, index) => ({
        occasion_id: event.id,
        category,
        sort_order: index + 1,
      })),
    ),
    'event_vendor_needs',
  )
  await ensure(
    supabase.from('committee_roles').insert(
      template.committeeRoles.map((role, index) => ({
        occasion_id: event.id,
        role: role.role,
        description: role.description,
        sort_order: index + 1,
      })),
    ),
    'committee_roles',
  )
  await ensure(
    supabase.from('event_modules').insert(
      template.defaultModules.map((label, index) => ({
        occasion_id: event.id,
        module_key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        label,
        status: 'enabled',
        sort_order: index + 1,
        metadata: {} as Json,
      })),
    ),
    'event_modules',
  )
  await ensure(
    supabase.from('event_workspace_settings').insert({
      occasion_id: event.id,
      memory_tribute_settings: template.memoryTributeSettings as unknown as Json,
      next_actions: template.nextActions as unknown as Json,
      tone: template.tone,
    }),
    'event_workspace_settings',
  )
}

function createDueDateFactory(eventDate?: string | null) {
  if (!eventDate) return () => null
  const base = new Date(eventDate)
  if (Number.isNaN(base.getTime())) return () => null

  return (offsetDays?: number) => {
    if (offsetDays == null) return null
    const date = new Date(base)
    date.setDate(date.getDate() + offsetDays)
    return date.toISOString()
  }
}

async function ensure(result: PromiseLike<{ error: { message: string } | null }>, label: string) {
  const { error } = await result
  if (error) throw new Error(`Failed to generate ${label}: ${error.message}`)
}
