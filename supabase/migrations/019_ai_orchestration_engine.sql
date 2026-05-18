create table if not exists automation_rules (
  id text primary key,
  occasion_id uuid not null references events(id) on delete cascade,
  trigger_type text not null,
  rule_type text not null,
  title text not null,
  description text not null,
  suggested_action text not null,
  metadata jsonb,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists automation_queue (
  id uuid primary key default gen_random_uuid(),
  automation_event_id uuid not null references automation_events(id) on delete cascade,
  occasion_id uuid not null references events(id) on delete cascade,
  status text not null default 'queued',
  payload jsonb,
  scheduled_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

create table if not exists automation_executions (
  id uuid primary key default gen_random_uuid(),
  automation_queue_id uuid not null references automation_queue(id) on delete cascade,
  status text not null,
  metadata jsonb,
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists automation_failures (
  id uuid primary key default gen_random_uuid(),
  automation_execution_id uuid not null references automation_executions(id) on delete cascade,
  error_message text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);
