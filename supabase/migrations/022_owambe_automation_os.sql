alter table automation_events
  add column if not exists organization_id uuid references organizations(id) on delete cascade,
  add column if not exists source_type text not null default 'system',
  add column if not exists source_id uuid,
  add column if not exists status text not null default 'new';

alter table automation_events
  alter column occasion_id drop not null,
  alter column payload set default '{}';

alter table automation_rules
  add column if not exists organization_id uuid references organizations(id) on delete cascade,
  add column if not exists action_type text not null default 'create_notification',
  add column if not exists conditions jsonb not null default '{}',
  add column if not exists action_payload jsonb not null default '{}',
  add column if not exists is_active boolean not null default true,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table automation_rules
  alter column occasion_id drop not null,
  alter column metadata set default '{}';

update automation_rules set is_active = coalesce(active, true) where is_active is distinct from coalesce(active, true);

alter table automation_queue
  add column if not exists automation_rule_id text references automation_rules(id) on delete set null,
  add column if not exists organization_id uuid references organizations(id) on delete cascade,
  add column if not exists action_type text not null default 'create_notification',
  add column if not exists attempts int not null default 0,
  add column if not exists max_attempts int not null default 3,
  add column if not exists run_after timestamptz not null default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists processed_at timestamptz,
  add column if not exists error_message text;

alter table automation_queue
  alter column occasion_id drop not null,
  alter column automation_event_id drop not null,
  alter column payload set default '{}',
  alter column scheduled_at drop not null;

update automation_queue set run_after = coalesce(scheduled_at, created_at, now()) where run_after is null;
update automation_queue set status = 'pending' where status = 'queued';

alter table automation_logs
  add column if not exists queue_id uuid references automation_queue(id) on delete set null,
  add column if not exists organization_id uuid references organizations(id) on delete cascade,
  add column if not exists occasion_id uuid references events(id) on delete cascade,
  add column if not exists action_type text not null default 'legacy',
  add column if not exists status text not null default 'info';

alter table automation_logs
  alter column automation_event_id drop not null,
  alter column level drop not null,
  alter column message drop not null,
  alter column metadata set default '{}';

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  occasion_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  channel text not null,
  title text,
  body text,
  payload jsonb not null default '{}',
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists automation_events_occasion_status_idx on automation_events(occasion_id, status, created_at desc);
create index if not exists automation_events_org_status_idx on automation_events(organization_id, status, created_at desc);
create index if not exists automation_queue_pending_idx on automation_queue(status, run_after, created_at);
create index if not exists automation_queue_occasion_idx on automation_queue(occasion_id, status);
create index if not exists automation_logs_occasion_idx on automation_logs(occasion_id, created_at desc);
create index if not exists notification_events_occasion_idx on notification_events(occasion_id, status, created_at desc);

create unique index if not exists automation_events_idempotency_idx
  on automation_events(occasion_id, event_type, source_id)
  where occasion_id is not null and source_id is not null;

create or replace function touch_automation_rules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists automation_rules_updated_at on automation_rules;
create trigger automation_rules_updated_at
  before update on automation_rules
  for each row execute function touch_automation_rules_updated_at();

alter table automation_rules enable row level security;
alter table automation_events enable row level security;
alter table automation_queue enable row level security;
alter table automation_logs enable row level security;
alter table notification_events enable row level security;

drop policy if exists "automation rules visible to operators" on automation_rules;
create policy "automation rules visible to operators" on automation_rules for select
  using (
    is_admin()
    or (occasion_id is not null and can_view_event_ops(occasion_id))
    or (organization_id is not null and can_view_organization(organization_id))
  );

drop policy if exists "automation rules managed by operators" on automation_rules;
create policy "automation rules managed by operators" on automation_rules for all
  using (
    is_admin()
    or (occasion_id is not null and can_manage_event(occasion_id))
    or (organization_id is not null and can_manage_organization(organization_id))
  )
  with check (
    is_admin()
    or (occasion_id is not null and can_manage_event(occasion_id))
    or (organization_id is not null and can_manage_organization(organization_id))
  );

drop policy if exists "automation events visible to operators" on automation_events;
create policy "automation events visible to operators" on automation_events for select
  using (
    is_admin()
    or (occasion_id is not null and can_view_event_ops(occasion_id))
    or (organization_id is not null and can_view_organization(organization_id))
  );

drop policy if exists "automation events inserted by operators" on automation_events;
create policy "automation events inserted by operators" on automation_events for insert
  with check (
    is_admin()
    or (occasion_id is not null and can_view_event_ops(occasion_id))
    or (organization_id is not null and can_manage_organization(organization_id))
  );

drop policy if exists "automation queue visible to operators" on automation_queue;
create policy "automation queue visible to operators" on automation_queue for select
  using (
    is_admin()
    or (occasion_id is not null and can_view_event_ops(occasion_id))
    or (organization_id is not null and can_view_organization(organization_id))
  );

drop policy if exists "automation queue managed by admins" on automation_queue;
create policy "automation queue managed by admins" on automation_queue for all
  using (is_admin())
  with check (is_admin());

drop policy if exists "automation logs visible to operators" on automation_logs;
create policy "automation logs visible to operators" on automation_logs for select
  using (
    is_admin()
    or (occasion_id is not null and can_view_event_ops(occasion_id))
    or (organization_id is not null and can_view_organization(organization_id))
  );

drop policy if exists "automation logs inserted by admins" on automation_logs;
create policy "automation logs inserted by admins" on automation_logs for insert
  with check (is_admin());

drop policy if exists "notification events visible to recipients" on notification_events;
create policy "notification events visible to recipients" on notification_events for select
  using (
    is_admin()
    or user_id = auth.uid()
    or (occasion_id is not null and can_view_event_ops(occasion_id))
    or (organization_id is not null and can_view_organization(organization_id))
  );

drop policy if exists "notification events inserted by operators" on notification_events;
create policy "notification events inserted by operators" on notification_events for insert
  with check (
    is_admin()
    or (occasion_id is not null and can_view_event_ops(occasion_id))
    or (organization_id is not null and can_manage_organization(organization_id))
  );

insert into automation_rules (
  id, rule_type, trigger_type, action_type, title, description, suggested_action,
  conditions, action_payload, is_active
) values
  ('default-task-overdue-escalation', 'escalation', 'task_overdue', 'escalate_to_organizer', 'Task overdue escalation', 'Escalates overdue tasks to the event organizer and assignee.', 'Review overdue tasks and assign a clear owner today.', '{"status_not":"done","due_before":"now"}', '{"channels":["in_app","whatsapp_ready"]}', true),
  ('default-rsvp-deadline-reminder', 'reminder', 'rsvp_deadline_approaching', 'generate_whatsapp_message', 'RSVP deadline reminder', 'Creates an RSVP reminder when response rate is low near the event date.', 'Send an RSVP reminder to invited guests.', '{"days_to_event_lte":7,"rsvp_rate_lt":60}', '{"template":"rsvp"}', true),
  ('default-vendor-inquiry-stale', 'reminder', 'vendor_inquiry_stale', 'create_follow_up_task', 'Vendor inquiry follow-up', 'Creates a follow-up task when a vendor inquiry is stale.', 'Follow up with vendors who have not responded.', '{"stale_hours":48}', '{"priority":"high"}', true),
  ('default-funding-gap-alert', 'alert', 'event_date_approaching', 'create_ai_recommendation', 'Funding gap alert', 'Recommends contribution outreach when funding is low near the event.', 'Share a contribution reminder and highlight open sponsorship categories.', '{"days_to_event_lte":14,"funding_progress_lt":70}', '{"recommendation_type":"funding"}', true),
  ('default-budget-overrun-warning', 'warning', 'budget_overrun', 'create_ai_recommendation', 'Budget overrun warning', 'Creates an AI warning when actual spend exceeds estimated budget.', 'Review budget overruns and update spend plans.', '{"actual_gt_estimated":true}', '{"recommendation_type":"budget"}', true),
  ('default-event-day-ops-reminder', 'reminder', 'event_date_approaching', 'create_activity_feed_item', 'Event-day operations checklist', 'Posts an operations reminder when the event is tomorrow.', 'Confirm vendors, RSVPs, check-ins, and emergency contacts.', '{"days_to_event_eq":1}', '{"activity_type":"automation.event_day"}', true),
  ('default-post-event-memory-prompt', 'reminder', 'event_completed', 'generate_whatsapp_message', 'Post-event memory prompt', 'Prompts guests to add memories after an event ends.', 'Share a memory wall prompt with guests.', '{"hours_after_event_gte":24}', '{"template":"memory"}', true),
  ('default-thank-you-reminder', 'reminder', 'contribution_paid', 'create_follow_up_task', 'Thank-you reminder', 'Reminds organizers to thank paid contributors.', 'Send thank-you messages to contributors.', '{"paid_contributions_gt":0}', '{"priority":"medium"}', true),
  ('default-organization-recurring-event', 'reminder', 'organization_event_due', 'create_notification', 'Recurring organization event reminder', 'Reminds organization admins to prepare recurring events.', 'Prepare the next recurring event workspace.', '{"days_to_event_lte":14}', '{"scope":"organization"}', true),
  ('default-suspicious-payout-review', 'alert', 'payout_requested', 'create_admin_review', 'Suspicious payout review', 'Creates an admin review when payout timing or funding patterns look risky.', 'Review payout request before approval.', '{"trust_status_in":["review","block","pending"]}', '{"review_type":"payout_trust"}', true)
on conflict (id) do update set
  rule_type = excluded.rule_type,
  trigger_type = excluded.trigger_type,
  action_type = excluded.action_type,
  title = excluded.title,
  description = excluded.description,
  suggested_action = excluded.suggested_action,
  conditions = excluded.conditions,
  action_payload = excluded.action_payload,
  is_active = excluded.is_active;
