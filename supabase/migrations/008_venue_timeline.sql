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
