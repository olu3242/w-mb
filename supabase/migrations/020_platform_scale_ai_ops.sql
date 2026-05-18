alter table events
  add column if not exists currency text not null default 'USD',
  add column if not exists timezone text not null default 'UTC',
  add column if not exists locale text not null default 'en-US',
  add column if not exists country text,
  add column if not exists diaspora_hub text;

alter table event_guests
  add column if not exists timezone text,
  add column if not exists locale text,
  add column if not exists country text;

alter table committee_members
  add column if not exists timezone text,
  add column if not exists locale text;

create table if not exists event_checkins (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  participant_type text not null default 'guest'
    check (participant_type in ('guest', 'vendor', 'committee', 'staff')),
  participant_name text not null,
  participant_contact text,
  qr_token text unique not null default encode(gen_random_bytes(24), 'hex'),
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists event_emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  alert_level text not null default 'warning'
    check (alert_level in ('info', 'warning', 'critical')),
  title text not null,
  description text not null,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists event_operation_updates (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  update_type text not null default 'status',
  title text not null,
  body text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  recipient text,
  message text not null,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'sent', 'failed')),
  channel text not null default 'whatsapp_ready',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists ai_memory_snapshots (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  memory_type text not null,
  summary text not null,
  payload jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists orchestration_logs (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid references events(id) on delete cascade,
  source text not null,
  level text not null default 'info'
    check (level in ('info', 'warning', 'critical')),
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table event_checkins enable row level security;
alter table event_emergency_alerts enable row level security;
alter table event_operation_updates enable row level security;
alter table whatsapp_messages enable row level security;
alter table ai_memory_snapshots enable row level security;
alter table orchestration_logs enable row level security;

create policy "ops manage checkin records" on event_checkins for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "ops read emergency alerts" on event_emergency_alerts for select
  using (can_view_event_ops(occasion_id));
create policy "ops manage emergency alerts" on event_emergency_alerts for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "ops manage operation updates" on event_operation_updates for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "ops read operation updates" on event_operation_updates for select
  using (can_view_event_ops(occasion_id));
create policy "ops manage whatsapp messages" on whatsapp_messages for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "ops read whatsapp messages" on whatsapp_messages for select
  using (can_view_event_ops(occasion_id));
create policy "ops manage ai memory" on ai_memory_snapshots for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "ops read ai memory" on ai_memory_snapshots for select
  using (can_view_event_ops(occasion_id));
create policy "ops manage orchestration logs" on orchestration_logs for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "ops read orchestration logs" on orchestration_logs for select
  using (can_view_event_ops(occasion_id));
