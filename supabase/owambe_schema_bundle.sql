-- OWAMBE: all migrations bundled

-- ===== 001_schema.sql =====

create extension if not exists "uuid-ossp";

create table events (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  description text,
  event_date timestamptz,
  location text,
  is_public boolean not null default true,
  signals jsonb not null default '{}',
  owner_id uuid not null references auth.users(id) on delete cascade,
  stripe_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gift_items (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text,
  amount int not null,
  is_funded boolean not null default false,
  created_at timestamptz not null default now()
);

create table contributions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  gift_item_id uuid references gift_items(id) on delete set null,
  amount int not null,
  contributor_name text not null,
  contributor_email text not null,
  message text,
  stripe_payment_intent_id text unique not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  status text not null default 'todo',
  created_at timestamptz not null default now()
);

create table vendors (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  category text not null,
  contact text,
  cost int,
  status text not null default 'prospect',
  created_at timestamptz not null default now()
);

create table budget_lines (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  category text not null,
  label text not null,
  estimated int not null,
  actual int,
  created_at timestamptz not null default now()
);

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger events_updated_at before update on events
  for each row execute procedure update_updated_at();

-- ===== 002_rls.sql =====

alter table events enable row level security;
alter table gift_items enable row level security;
alter table contributions enable row level security;
alter table tasks enable row level security;
alter table vendors enable row level security;
alter table budget_lines enable row level security;

-- events
create policy "owner can do all" on events for all using (auth.uid() = owner_id);
create policy "public events visible to all" on events for select using (is_public = true);

-- gift_items
create policy "event owner manages gifts" on gift_items for all
  using (exists (select 1 from events where id = gift_items.event_id and owner_id = auth.uid()));
create policy "public gift items visible" on gift_items for select
  using (exists (select 1 from events where id = gift_items.event_id and is_public = true));

-- contributions
create policy "event owner reads contributions" on contributions for select
  using (exists (select 1 from events where id = contributions.event_id and owner_id = auth.uid()));
create policy "anyone can insert contribution" on contributions for insert with check (true);

-- tasks
create policy "event owner manages tasks" on tasks for all
  using (exists (select 1 from events where id = tasks.event_id and owner_id = auth.uid()));

-- vendors
create policy "event owner manages vendors" on vendors for all
  using (exists (select 1 from events where id = vendors.event_id and owner_id = auth.uid()));

-- budget_lines
create policy "event owner manages budget" on budget_lines for all
  using (exists (select 1 from events where id = budget_lines.event_id and owner_id = auth.uid()));

-- ===== 003_alice.sql =====

-- Extend events with ALICE fields
alter table events
  add column if not exists alice_unlocked boolean not null default false,
  add column if not exists alice_paid_at timestamptz,
  add column if not exists alice_payment_ref text;

-- Add paystack_reference to contributions
alter table contributions
  add column if not exists paystack_reference text unique;

-- event_context: ALICE calibration inputs
create table event_context (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade unique,
  guest_count int not null default 50,
  style_tier text not null default 'standard',
  location_type text not null default 'indoor',
  hero_element text not null default 'food',
  budget_ceiling numeric,
  event_month int,
  event_dow int,
  raw_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- event_facets: computed budget breakdown
create table event_facets (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade unique,
  context_id uuid references event_context(id) on delete cascade,
  raw_total numeric,
  final_total numeric,
  demand_multiplier numeric,
  allocations jsonb not null default '{}',
  generated_at timestamptz not null default now()
);

-- alice_alerts: monitor warnings
create table alice_alerts (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'info',
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- alice_decisions: recommendations accepted/rejected
create table alice_decisions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  decision_type text not null,
  payload jsonb not null default '{}',
  accepted boolean,
  created_at timestamptz not null default now()
);

-- system_events: audit log
create table system_events (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- vendor_invites
create table vendor_invites (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  email text not null,
  name text,
  status text not null default 'pending',
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

create trigger event_context_updated_at before update on event_context
  for each row execute procedure update_updated_at();

-- ===== 004_alice_rpcs.sql =====

create or replace function calculate_alice_budget(
  p_guest_count int,
  p_style_tier text,
  p_location_type text,
  p_budget_ceiling numeric default null,
  p_event_month int default null,
  p_event_dow int default null
) returns jsonb language plpgsql as $$
declare
  v_base_rate numeric;
  v_location_mult numeric := 1.0;
  v_demand_mult numeric := 1.0;
  v_raw_total numeric;
  v_final_total numeric;
begin
  v_base_rate := case p_style_tier
    when 'intimate' then 8000
    when 'standard' then 15000
    when 'premium'  then 28000
    when 'luxury'   then 55000
    else 15000
  end;

  v_location_mult := case p_location_type
    when 'outdoor' then 1.15
    when 'hybrid'  then 1.25
    else 1.0
  end;

  v_demand_mult := 1.0;
  if p_event_month in (11, 12) then v_demand_mult := v_demand_mult + 0.20; end if;
  if p_event_month = 4           then v_demand_mult := v_demand_mult + 0.10; end if;
  if p_event_dow = 6             then v_demand_mult := v_demand_mult + 0.15; end if;
  if p_event_dow = 5             then v_demand_mult := v_demand_mult + 0.08; end if;

  v_raw_total   := p_guest_count * v_base_rate * v_location_mult;
  v_final_total := v_raw_total * v_demand_mult;

  if p_budget_ceiling is not null and v_final_total > p_budget_ceiling then
    v_final_total := p_budget_ceiling;
  end if;

  return jsonb_build_object(
    'raw_total',         v_raw_total,
    'final_total',       v_final_total,
    'demand_multiplier', v_demand_mult
  );
end;
$$;

create or replace function get_facet_allocations(
  p_style_tier text,
  p_hero_element text default 'food'
) returns jsonb language plpgsql as $$
declare
  v_alloc jsonb;
  v_hero_pct int;
  v_misc_pct int;
begin
  v_alloc := case p_style_tier
    when 'intimate' then
      '{"catering":40,"entertainment":10,"decor":15,"venue":15,"photography":8,"logistics":5,"attire":5,"miscellaneous":2}'::jsonb
    when 'premium' then
      '{"catering":30,"entertainment":18,"decor":18,"venue":15,"photography":10,"logistics":4,"attire":4,"miscellaneous":1}'::jsonb
    when 'luxury' then
      '{"catering":25,"entertainment":22,"decor":22,"venue":15,"photography":10,"logistics":3,"attire":2,"miscellaneous":1}'::jsonb
    else
      '{"catering":35,"entertainment":15,"decor":15,"venue":15,"photography":9,"logistics":5,"attire":4,"miscellaneous":2}'::jsonb
  end;

  if p_hero_element = any(array['catering','entertainment','decor','venue','photography']) then
    v_hero_pct := (v_alloc->>p_hero_element)::int + 5;
    v_misc_pct := greatest(0, (v_alloc->>'miscellaneous')::int - 5);
    v_alloc := jsonb_set(v_alloc, array[p_hero_element], to_jsonb(v_hero_pct));
    v_alloc := jsonb_set(v_alloc, '{miscellaneous}', to_jsonb(v_misc_pct));
  end if;

  return v_alloc;
end;
$$;

create or replace function update_event_signal(
  p_event_id uuid,
  p_signal text,
  p_value boolean
) returns void language plpgsql security definer as $$
begin
  update events
  set signals = jsonb_set(signals, array[p_signal], to_jsonb(p_value), true)
  where id = p_event_id;
end;
$$;

-- ===== 005_alice_rls.sql =====

alter table event_context   enable row level security;
alter table event_facets    enable row level security;
alter table alice_alerts    enable row level security;
alter table alice_decisions enable row level security;
alter table system_events   enable row level security;
alter table vendor_invites  enable row level security;

create policy "host manages context" on event_context for all
  using (exists (select 1 from events where id = event_context.event_id and owner_id = auth.uid()));

create policy "host manages facets" on event_facets for all
  using (exists (select 1 from events where id = event_facets.event_id and owner_id = auth.uid()));

create policy "host manages alerts" on alice_alerts for all
  using (exists (select 1 from events where id = alice_alerts.event_id and owner_id = auth.uid()));

create policy "host manages decisions" on alice_decisions for all
  using (exists (select 1 from events where id = alice_decisions.event_id and owner_id = auth.uid()));

create policy "host reads system_events" on system_events for select
  using (exists (select 1 from events where id = system_events.event_id and owner_id = auth.uid()));

create policy "host manages invites" on vendor_invites for all
  using (exists (select 1 from events where id = vendor_invites.event_id and owner_id = auth.uid()));

-- ===== 006_alice_naija.sql =====

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

-- ===== 007_alice_naija_rpcs.sql =====

-- Naija-Aware budget engine: geospatial + 20.38% inflation buffer
create or replace function calculate_alice_budget(
  p_guest_count     int,
  p_style_tier      text,
  p_location_type   text,
  p_location_area   text    default 'state_capital',
  p_budget_ceiling  numeric default null,
  p_event_month     int     default null,
  p_event_dow       int     default null
) returns jsonb language plpgsql security definer as $$
declare
  v_base_rate      numeric;
  v_location_mult  numeric := 1.0;
  v_area_mult      numeric := 1.0;
  v_demand_mult    numeric := 1.0;
  v_inflation_mult constant numeric := 1.2038;  -- 15.38% CPI + 5% wahala
  v_raw_total      numeric;
  v_final_total    numeric;
begin
  v_base_rate := case p_style_tier
    when 'intimate' then 8000
    when 'standard' then 15000
    when 'premium'  then 28000
    when 'luxury'   then 55000
    else 15000
  end;

  v_location_mult := case p_location_type
    when 'outdoor' then 1.15
    when 'hybrid'  then 1.25
    else 1.0
  end;

  -- Geospatial: Lekki/VI/Ikoyi/Maitama/Asokoro = premium
  v_area_mult := case p_location_area
    when 'premium'       then 1.80
    when 'urban'         then 1.30
    when 'state_capital' then 1.00
    when 'other'         then 0.85
    else 1.00
  end;

  if p_event_month in (11, 12) then v_demand_mult := v_demand_mult + 0.20; end if;
  if p_event_month = 4          then v_demand_mult := v_demand_mult + 0.10; end if;
  if p_event_dow = 6            then v_demand_mult := v_demand_mult + 0.15; end if;
  if p_event_dow = 5            then v_demand_mult := v_demand_mult + 0.08; end if;

  v_raw_total   := p_guest_count * v_base_rate * v_location_mult * v_area_mult * v_inflation_mult;
  v_final_total := v_raw_total * v_demand_mult;

  if p_budget_ceiling is not null and v_final_total > p_budget_ceiling then
    v_final_total := p_budget_ceiling;
  end if;

  return jsonb_build_object(
    'raw_total',         round(v_raw_total),
    'final_total',       round(v_final_total),
    'demand_multiplier', round(v_demand_mult::numeric, 2),
    'area_multiplier',   round(v_area_mult::numeric, 2),
    'inflation_buffer',  0.2038
  );
end;
$$;

-- 8 Naija facets: Food is King. Crisis triage cuts Tier 3 to protect Hero.
create or replace function get_facet_allocations(
  p_style_tier         text,
  p_hero_element       text    default 'catering',
  p_crisis_deficit_pct numeric default 0
) returns jsonb language plpgsql security definer as $$
declare
  v_alloc      jsonb;
  v_triage_cut numeric;
begin
  v_alloc := case p_style_tier
    when 'intimate' then jsonb_build_object(
      'catering', 35, 'venue', 20, 'decor', 12, 'media', 8,
      'entertainment', 10, 'security', 5, 'souvenirs', 5, 'admin', 5
    )
    when 'premium' then jsonb_build_object(
      'catering', 30, 'venue', 18, 'decor', 15, 'media', 10,
      'entertainment', 12, 'security', 6, 'souvenirs', 5, 'admin', 4
    )
    when 'luxury' then jsonb_build_object(
      'catering', 28, 'venue', 18, 'decor', 15, 'media', 11,
      'entertainment', 13, 'security', 7, 'souvenirs', 5, 'admin', 3
    )
    else jsonb_build_object(
      'catering', 32, 'venue', 20, 'decor', 13, 'media', 9,
      'entertainment', 10, 'security', 5, 'souvenirs', 6, 'admin', 5
    )
  end;

  -- Hero element boost: +5pp trimmed from souvenirs + admin
  if p_hero_element != 'catering' and v_alloc ? p_hero_element then
    v_alloc := jsonb_set(v_alloc, array[p_hero_element],
      to_jsonb((v_alloc->>p_hero_element)::numeric + 5));
    v_alloc := jsonb_set(v_alloc, '{souvenirs}',
      to_jsonb(greatest(2, (v_alloc->>'souvenirs')::numeric - 2.5)));
    v_alloc := jsonb_set(v_alloc, '{admin}',
      to_jsonb(greatest(2, (v_alloc->>'admin')::numeric - 2.5)));
  end if;

  -- Crisis triage: cut Tier 3 (souvenirs+admin) 30% → protect catering
  if p_crisis_deficit_pct > 0 then
    v_triage_cut := (v_alloc->>'souvenirs')::numeric * 0.30
                  + (v_alloc->>'admin')::numeric * 0.30;
    v_alloc := jsonb_set(v_alloc, '{souvenirs}',
      to_jsonb((v_alloc->>'souvenirs')::numeric * 0.70));
    v_alloc := jsonb_set(v_alloc, '{admin}',
      to_jsonb((v_alloc->>'admin')::numeric * 0.70));
    v_alloc := jsonb_set(v_alloc, '{catering}',
      to_jsonb((v_alloc->>'catering')::numeric + v_triage_cut));
  end if;

  return v_alloc;
end;
$$;

create or replace function update_event_signal(
  p_event_id uuid,
  p_signal   text,
  p_value    boolean
) returns void language plpgsql security definer as $$
begin
  update events
  set signals = jsonb_set(signals, array[p_signal], to_jsonb(p_value), true)
  where id = p_event_id;
end;
$$;

-- ===== 008_venue_timeline.sql =====

create table venues (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  address text,
  capacity int,
  contact text,
  cost_kobo bigint default 0,
  power_grid boolean not null default false,
  gen1_kva int,
  gen2_kva int,
  fuel_litres int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);

create table timeline_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  scheduled_time text not null,
  title text not null,
  responsible text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done')),
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create trigger update_venues_updated_at
  before update on venues
  for each row execute function update_updated_at();

alter table venues enable row level security;
alter table timeline_items enable row level security;

create policy "venues_owner" on venues for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "timeline_owner" on timeline_items for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);

-- ===== 009_payments_vendors.sql =====

-- payments table (idempotent, provider-agnostic)
create table payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  amount numeric not null,
  provider text not null check (provider in ('stripe', 'paystack')),
  reference text not null unique,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- vendor invite lifecycle columns
alter table vendor_invites
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_at timestamptz;

-- default 7-day expiry for existing rows
update vendor_invites set expires_at = created_at + interval '7 days' where expires_at is null;

-- event_vendors junction (invite → confirmed vendor per facet)
create table event_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  invite_id uuid references vendor_invites(id) on delete set null,
  facet_name text not null,
  quote_amount numeric,
  status text not null default 'invited' check (status in ('invited', 'confirmed', 'active')),
  created_at timestamptz not null default now(),
  unique (event_id, vendor_id)
);

-- facet payment/quote tracking columns
alter table event_facets
  add column if not exists amount_paid numeric not null default 0,
  add column if not exists balance_due numeric not null default 0,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid')),
  add column if not exists actual_quotes jsonb not null default '{}';

-- RLS
alter table payments enable row level security;
alter table event_vendors enable row level security;

create policy "payments_owner" on payments for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "event_vendors_owner" on event_vendors for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);

-- allow unauthenticated token-based read of vendor_invites (token is the secret)
create policy "vendor_invites_public_token_read" on vendor_invites
  for select using (true);

-- ===== 010_escrow.sql =====

-- Escrow account: one per event, tracks fund balance
create table escrow_accounts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  balance numeric not null default 0 check (balance >= 0),
  total_contributed numeric not null default 0,
  total_allocated numeric not null default 0,
  total_released numeric not null default 0,
  status text not null default 'active'
    check (status in ('active', 'frozen', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);

-- Immutable ledger — no UPDATE or DELETE permitted via RLS
create table escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  escrow_account_id uuid not null references escrow_accounts(id),
  event_id uuid not null references events(id),
  type text not null
    check (type in ('credit','allocation','allocation_cancel','payout_debit','refund')),
  amount numeric not null check (amount > 0),
  balance_after numeric not null,
  available_after numeric not null,
  reference text,
  payment_id uuid references payments(id) on delete set null,
  allocation_id uuid,
  payout_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

-- Vendor allocations: funds earmarked from escrow
create table vendor_allocations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  escrow_account_id uuid not null references escrow_accounts(id),
  vendor_id uuid not null references vendors(id) on delete restrict,
  event_vendor_id uuid references event_vendors(id) on delete set null,
  facet_name text not null,
  amount numeric not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending','approved','released','cancelled')),
  approved_at timestamptz,
  released_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- Vendor payouts: actual fund disbursements
create table vendor_payouts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  allocation_id uuid not null references vendor_allocations(id),
  vendor_id uuid not null references vendors(id),
  amount numeric not null check (amount > 0),
  provider text not null default 'manual'
    check (provider in ('paystack','stripe','manual')),
  provider_reference text,
  recipient_code text,
  bank_name text,
  account_number text,
  account_name text,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  failure_reason text,
  notes text,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Add deferred FKs for circular allocation ↔ transaction refs
alter table escrow_transactions
  add constraint fk_et_allocation
    foreign key (allocation_id) references vendor_allocations(id) on delete set null deferrable initially deferred,
  add constraint fk_et_payout
    foreign key (payout_id) references vendor_payouts(id) on delete set null deferrable initially deferred;

-- Store paystack recipient code on vendor for reuse
alter table vendors
  add column if not exists paystack_recipient_code text;

create trigger update_escrow_accounts_updated_at
  before update on escrow_accounts
  for each row execute function update_updated_at();

-- RLS
alter table escrow_accounts     enable row level security;
alter table escrow_transactions  enable row level security;
alter table vendor_allocations   enable row level security;
alter table vendor_payouts       enable row level security;

create policy "escrow_owner" on escrow_accounts for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
-- Ledger: owner can SELECT only (no update/delete via client)
create policy "ledger_owner_read" on escrow_transactions for select using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "allocations_owner" on vendor_allocations for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);
create policy "payouts_owner" on vendor_payouts for all using (
  exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid())
);

-- ===== 011_escrow_rpcs.sql =====

-- ─────────────────────────────────────────────────────────────
-- credit_escrow
-- Called after payment is verified. Creates escrow account if
-- needed. Idempotent on reference.
-- ─────────────────────────────────────────────────────────────
create or replace function credit_escrow(
  p_event_id    uuid,
  p_amount      numeric,
  p_reference   text,
  p_payment_id  uuid default null
) returns jsonb language plpgsql security definer as $$
declare
  v_acct    escrow_accounts;
  v_new_bal numeric;
  v_avail   numeric;
begin
  -- Idempotency guard
  if exists (
    select 1 from escrow_transactions
    where event_id = p_event_id and reference = p_reference and type = 'credit'
  ) then
    return jsonb_build_object('status','already_credited','reference',p_reference);
  end if;

  -- Lock or create escrow account
  select * into v_acct from escrow_accounts
  where event_id = p_event_id for update;

  if not found then
    insert into escrow_accounts(event_id, balance, total_contributed)
    values(p_event_id, p_amount, p_amount)
    returning * into v_acct;
    v_new_bal := p_amount;
    v_avail   := p_amount;
  else
    if v_acct.status = 'frozen' then
      raise exception 'Escrow account is frozen for event %', p_event_id;
    end if;
    v_new_bal := v_acct.balance + p_amount;
    v_avail   := v_new_bal - v_acct.total_allocated;
    update escrow_accounts set
      balance           = v_new_bal,
      total_contributed = total_contributed + p_amount,
      updated_at        = now()
    where id = v_acct.id;
  end if;

  insert into escrow_transactions(
    escrow_account_id, event_id, type, amount,
    balance_after, available_after, reference, payment_id
  ) values(
    v_acct.id, p_event_id, 'credit', p_amount,
    v_new_bal, v_avail, p_reference, p_payment_id
  );

  return jsonb_build_object(
    'status','credited','balance',v_new_bal,'available',v_avail
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- allocate_escrow
-- Earmarks funds for a vendor. Fails if insufficient available
-- balance. Uses FOR UPDATE to prevent race conditions.
-- ─────────────────────────────────────────────────────────────
create or replace function allocate_escrow(
  p_event_id        uuid,
  p_vendor_id       uuid,
  p_amount          numeric,
  p_facet_name      text,
  p_event_vendor_id uuid    default null,
  p_notes           text    default null
) returns jsonb language plpgsql security definer as $$
declare
  v_acct        escrow_accounts;
  v_avail       numeric;
  v_alloc_id    uuid;
begin
  select * into v_acct from escrow_accounts
  where event_id = p_event_id for update;

  if not found then
    raise exception 'No escrow account for event %', p_event_id;
  end if;
  if v_acct.status != 'active' then
    raise exception 'Escrow account is %', v_acct.status;
  end if;

  v_avail := v_acct.balance - v_acct.total_allocated;

  if p_amount > v_avail then
    raise exception 'Insufficient balance: available=%, requested=%', v_avail, p_amount;
  end if;

  insert into vendor_allocations(
    event_id, escrow_account_id, vendor_id,
    event_vendor_id, facet_name, amount, notes
  ) values(
    p_event_id, v_acct.id, p_vendor_id,
    p_event_vendor_id, p_facet_name, p_amount, p_notes
  ) returning id into v_alloc_id;

  update escrow_accounts set
    total_allocated = total_allocated + p_amount,
    updated_at      = now()
  where id = v_acct.id;

  insert into escrow_transactions(
    escrow_account_id, event_id, type, amount,
    balance_after, available_after, allocation_id
  ) values(
    v_acct.id, p_event_id, 'allocation', p_amount,
    v_acct.balance, v_avail - p_amount, v_alloc_id
  );

  return jsonb_build_object(
    'status','allocated',
    'allocation_id', v_alloc_id,
    'available_after', v_avail - p_amount
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- cancel_allocation
-- Frees reserved funds back to available pool.
-- ─────────────────────────────────────────────────────────────
create or replace function cancel_allocation(
  p_allocation_id uuid
) returns jsonb language plpgsql security definer as $$
declare
  v_alloc vendor_allocations;
  v_acct  escrow_accounts;
  v_avail numeric;
begin
  select * into v_alloc from vendor_allocations
  where id = p_allocation_id for update;
  if not found then raise exception 'Allocation not found'; end if;
  if v_alloc.status not in ('pending','approved') then
    raise exception 'Cannot cancel allocation with status %', v_alloc.status;
  end if;

  select * into v_acct from escrow_accounts
  where id = v_alloc.escrow_account_id for update;

  update vendor_allocations set status = 'cancelled' where id = p_allocation_id;
  update escrow_accounts set
    total_allocated = total_allocated - v_alloc.amount,
    updated_at = now()
  where id = v_acct.id;

  v_avail := v_acct.balance - (v_acct.total_allocated - v_alloc.amount);

  insert into escrow_transactions(
    escrow_account_id, event_id, type, amount,
    balance_after, available_after, allocation_id
  ) values(
    v_acct.id, v_alloc.event_id, 'allocation_cancel', v_alloc.amount,
    v_acct.balance, v_avail, p_allocation_id
  );

  return jsonb_build_object('status','cancelled','available_after',v_avail);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- approve_allocation
-- Moves allocation from pending → approved (authorises payout).
-- ─────────────────────────────────────────────────────────────
create or replace function approve_allocation(
  p_allocation_id uuid
) returns jsonb language plpgsql security definer as $$
declare
  v_alloc vendor_allocations;
begin
  select * into v_alloc from vendor_allocations
  where id = p_allocation_id for update;
  if not found then raise exception 'Allocation not found'; end if;
  if v_alloc.status != 'pending' then
    raise exception 'Allocation is already %', v_alloc.status;
  end if;

  update vendor_allocations set
    status = 'approved', approved_at = now()
  where id = p_allocation_id;

  return jsonb_build_object('status','approved','allocation_id',p_allocation_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- complete_payout
-- Called after provider confirms transfer. Atomically debits
-- escrow balance, marks payout complete, writes ledger entry.
-- Idempotent on payout_id.
-- ─────────────────────────────────────────────────────────────
create or replace function complete_payout(
  p_payout_id          uuid,
  p_provider_reference text default null
) returns jsonb language plpgsql security definer as $$
declare
  v_payout  vendor_payouts;
  v_alloc   vendor_allocations;
  v_acct    escrow_accounts;
  v_new_bal numeric;
  v_avail   numeric;
begin
  select * into v_payout from vendor_payouts
  where id = p_payout_id for update;
  if not found then raise exception 'Payout not found'; end if;
  if v_payout.status = 'completed' then
    return jsonb_build_object('status','already_completed');
  end if;
  if v_payout.status = 'failed' then
    raise exception 'Cannot complete a failed payout';
  end if;

  select * into v_alloc from vendor_allocations
  where id = v_payout.allocation_id for update;
  if v_alloc.status != 'approved' then
    raise exception 'Allocation must be approved before payout can complete';
  end if;

  select * into v_acct from escrow_accounts
  where id = v_alloc.escrow_account_id for update;

  -- Debit balance
  v_new_bal := v_acct.balance - v_payout.amount;
  if v_new_bal < 0 then
    raise exception 'Escrow balance would go negative';
  end if;
  v_avail := v_new_bal - (v_acct.total_allocated - v_payout.amount);

  update escrow_accounts set
    balance         = v_new_bal,
    total_allocated = total_allocated - v_payout.amount,
    total_released  = total_released  + v_payout.amount,
    updated_at      = now()
  where id = v_acct.id;

  update vendor_allocations set
    status = 'released', released_at = now()
  where id = v_alloc.id;

  update vendor_payouts set
    status             = 'completed',
    completed_at       = now(),
    provider_reference = coalesce(p_provider_reference, provider_reference)
  where id = p_payout_id;

  insert into escrow_transactions(
    escrow_account_id, event_id, type, amount,
    balance_after, available_after, allocation_id, payout_id
  ) values(
    v_acct.id, v_alloc.event_id, 'payout_debit', v_payout.amount,
    v_new_bal, v_avail, v_alloc.id, p_payout_id
  );

  return jsonb_build_object(
    'status','completed','balance_after',v_new_bal,'available_after',v_avail
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- escrow_consistency_check
-- Returns any integrity violations. Run periodically or on-demand.
-- ─────────────────────────────────────────────────────────────
create or replace function escrow_consistency_check(
  p_event_id uuid
) returns jsonb language plpgsql security definer as $$
declare
  v_acct          escrow_accounts;
  v_sum_credits   numeric;
  v_sum_debits    numeric;
  v_sum_alloc     numeric;
  v_expected_bal  numeric;
  v_issues        jsonb := '[]';
begin
  select * into v_acct from escrow_accounts where event_id = p_event_id;
  if not found then return jsonb_build_object('ok',true,'message','No escrow account'); end if;

  select coalesce(sum(amount),0) into v_sum_credits
  from escrow_transactions where event_id = p_event_id and type = 'credit';

  select coalesce(sum(amount),0) into v_sum_debits
  from escrow_transactions where event_id = p_event_id and type = 'payout_debit';

  select coalesce(sum(amount),0) into v_sum_alloc
  from vendor_allocations
  where event_id = p_event_id and status in ('pending','approved');

  v_expected_bal := v_sum_credits - v_sum_debits;

  if abs(v_acct.balance - v_expected_bal) > 0.01 then
    v_issues := v_issues || jsonb_build_object(
      'type','balance_mismatch',
      'stored', v_acct.balance,
      'expected', v_expected_bal
    );
  end if;

  if abs(v_acct.total_allocated - v_sum_alloc) > 0.01 then
    v_issues := v_issues || jsonb_build_object(
      'type','allocation_mismatch',
      'stored', v_acct.total_allocated,
      'expected', v_sum_alloc
    );
  end if;

  return jsonb_build_object(
    'ok', jsonb_array_length(v_issues) = 0,
    'issues', v_issues,
    'balance', v_acct.balance,
    'total_allocated', v_acct.total_allocated,
    'available', v_acct.balance - v_acct.total_allocated
  );
end;
$$;

-- ===== 012_profiles_auth_flow.sql =====

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on profiles;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

alter table profiles enable row level security;

drop policy if exists "profiles_owner_select" on profiles;
create policy "profiles_owner_select" on profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_owner_update" on profiles;
create policy "profiles_owner_update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(profiles.full_name, excluded.full_name),
        updated_at = now();

  insert into public.client_preferences (owner_id)
  values (new.id)
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
