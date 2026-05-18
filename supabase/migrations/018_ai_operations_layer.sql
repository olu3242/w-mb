create table if not exists ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  recommendation_type text not null,
  title text not null,
  reason text not null,
  recommendation text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists automation_logs (
  id uuid primary key default gen_random_uuid(),
  automation_event_id uuid not null references automation_events(id) on delete cascade,
  level text not null,
  message text not null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists event_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  overall_score integer not null,
  metrics jsonb not null,
  health_summary text,
  created_at timestamp with time zone default now()
);
