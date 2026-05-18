-- Vendor reliability scores (post-event feedback loop)
create table vendor_scores (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  punctuality_score numeric(3,1) not null check (punctuality_score between 0 and 10),
  quality_score numeric(3,1) not null check (quality_score between 0 and 10),
  reliability_score numeric(3,1) generated always as (
    round(punctuality_score * 0.6 + quality_score * 0.4, 1)
  ) stored,
  notes text,
  created_at timestamptz not null default now()
);

-- Client preference memory (recursive override layer)
create table client_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  face_priority boolean not null default false,
  disliked_categories text[] not null default '{}',
  budget_style text not null default 'balanced'
    check (budget_style in ('tight', 'balanced', 'lavish')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

-- D-Day inventory burn rate tracker (store → floor)
create table event_inventory (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  item_name text not null,
  facet text not null,
  total_qty numeric not null default 0,
  store_qty numeric not null default 0,
  floor_qty numeric not null default 0,
  unit_cost_kobo bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- T-7 lockdown crew registry
create table vendor_crew (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  crew_name text not null,
  plate_number text,
  crew_id_verified boolean not null default false,
  fuel_audited boolean not null default false,
  high_scrutiny boolean not null default false,
  created_at timestamptz not null default now()
);

-- Guest Experience Score (AC×0.3 + service×0.4 + bathroom×0.3)
create table guest_experience_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  ac_score numeric(3,1) check (ac_score between 0 and 10),
  service_speed_score numeric(3,1) check (service_speed_score between 0 and 10),
  bathroom_score numeric(3,1) check (bathroom_score between 0 and 10),
  overall_score numeric(4,2) generated always as (
    round(
      coalesce(ac_score, 0) * 0.3 +
      coalesce(service_speed_score, 0) * 0.4 +
      coalesce(bathroom_score, 0) * 0.3,
    2)
  ) stored,
  notes text,
  created_at timestamptz not null default now()
);

-- Naija-Aware fields on event_context
alter table event_context
  add column if not exists location_area text not null default 'state_capital'
    check (location_area in ('premium', 'urban', 'state_capital', 'other')),
  add column if not exists event_type text not null default 'party'
    check (event_type in ('wedding', 'funeral', 'birthday', 'corporate', 'naming', 'party')),
  add column if not exists face_priority boolean not null default false;

-- AvE data (actual vs expected per facet, updated by runAliceMonitor)
alter table event_facets
  add column if not exists ave_data jsonb not null default '{}';

-- updated_at triggers
create trigger update_client_preferences_updated_at
  before update on client_preferences
  for each row execute function update_updated_at();

create trigger update_event_inventory_updated_at
  before update on event_inventory
  for each row execute function update_updated_at();

-- RLS
alter table vendor_scores enable row level security;
alter table client_preferences enable row level security;
alter table event_inventory enable row level security;
alter table vendor_crew enable row level security;
alter table guest_experience_scores enable row level security;

create policy "vendor_scores_owner" on vendor_scores for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "client_preferences_owner" on client_preferences for all using (
  owner_id = auth.uid()
);
create policy "event_inventory_owner" on event_inventory for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "vendor_crew_owner" on vendor_crew for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "guest_experience_scores_owner" on guest_experience_scores for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
