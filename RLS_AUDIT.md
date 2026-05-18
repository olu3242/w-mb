# RLS Audit

## Status

Codebase review status: **Pass**

Hosted database verification status: **Blocked until Supabase project is linked**

Attempted:

```bash
supabase migration list
supabase migration list --linked -p '<password>'
```

Result:

```text
Cannot find project ref. Have you run supabase link?
```

## Tables With RLS Coverage

Core:

- `events`
- `gift_items`
- `contributions`
- `tasks`
- `vendors`
- `budget_lines`

Planning workspace:

- `event_organizers`
- `event_tasks`
- `event_timeline_items`
- `budget_categories`
- `sponsorship_categories`
- `event_modules`
- `committee_roles`
- `event_vendor_needs`
- `event_workspace_settings`

Payments/trust:

- `payment_events`
- `transactions`
- `payout_accounts`
- `payout_requests`
- `admin_reviews`
- `audit_logs`

Collaboration:

- `committee_members`
- `guest_groups`
- `event_guests`
- `event_rsvps`
- `announcements`
- `event_updates`
- `notifications`
- `activity_feed`
- `task_comments`
- `ai_context_memories`

AI operations:

- `event_checkins`
- `event_emergency_alerts`
- `event_operation_updates`
- `whatsapp_messages`
- `ai_memory_snapshots`
- `orchestration_logs`

Organizations/vendors:

- `organizations`
- `organization_members`
- `organization_events`
- `organization_announcements`
- `organization_funds`
- `organization_activity`
- `organization_ai_context`
- `vendor_service_packages`
- `vendor_crm_notes`
- `vendor_leads`
- `vendor_subscription_plans`

## Policy Helpers

Reviewed helper functions:

- `can_manage_event(p_event_id uuid)`
- `can_view_event_ops(p_event_id uuid)`
- `is_admin()`
- `can_manage_organization(p_org_id uuid)`
- `can_view_organization(p_org_id uuid)`

These are `security definer` helpers and should be kept small, stable, and owner-controlled.

## Public Read Policies

Allowed public reads include:

- public events
- public gift items
- public sponsorship categories for public events
- public vendor directory/packages/plans
- public memory posts
- public event updates
- public activity marked public

## Sensitive Policies

Sensitive data is scoped to organizers/admins:

- full contributions
- transactions
- payment events
- payout requests
- audit logs
- admin reviews
- AI memory snapshots
- orchestration logs
- organization private activity/funds
- vendor CRM notes/leads

## Required Hosted Checks

Before production launch, run:

```bash
supabase link --project-ref <project-ref>
supabase migration list --linked
supabase db lint --linked
supabase gen types typescript --linked > types/database.ts
```

Then verify no policy recursion errors appear in the Supabase dashboard logs during:

- event dashboard load
- organization dashboard load
- public event page load
- contribution checkout
- webhook replay
