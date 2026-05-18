create table if not exists event_organizers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'co_organizer'
    check (role in ('organizer', 'co_organizer')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create or replace function can_manage_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from events e
    where e.id = p_event_id
      and e.owner_id = auth.uid()
  )
  or exists (
    select 1
    from event_organizers eo
    where eo.event_id = p_event_id
      and eo.user_id = auth.uid()
      and eo.status = 'active'
      and eo.role in ('organizer', 'co_organizer')
  );
$$;

create table if not exists event_tasks (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  due_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_timeline_items (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  title text not null,
  description text,
  milestone_type text not null,
  due_at timestamptz,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budget_categories (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  name text not null,
  estimated_amount numeric not null default 0,
  actual_amount numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sponsorship_categories (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric not null default 0,
  funded_amount numeric not null default 0,
  status text not null default 'open'
    check (status in ('open', 'funded', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_modules (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  module_key text not null,
  label text not null,
  status text not null default 'enabled'
    check (status in ('enabled', 'disabled')),
  sort_order int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (occasion_id, module_key)
);

create table if not exists committee_roles (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  role text not null,
  description text,
  assigned_to uuid references auth.users(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_vendor_needs (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  category text not null,
  status text not null default 'needed'
    check (status in ('needed', 'shortlisting', 'booked', 'not_needed')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_workspace_settings (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade unique,
  tone text not null,
  memory_tribute_settings jsonb not null default '{}',
  next_actions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger event_tasks_updated_at before update on event_tasks
  for each row execute function update_updated_at();
create trigger event_timeline_items_updated_at before update on event_timeline_items
  for each row execute function update_updated_at();
create trigger budget_categories_updated_at before update on budget_categories
  for each row execute function update_updated_at();
create trigger sponsorship_categories_updated_at before update on sponsorship_categories
  for each row execute function update_updated_at();
create trigger event_modules_updated_at before update on event_modules
  for each row execute function update_updated_at();
create trigger committee_roles_updated_at before update on committee_roles
  for each row execute function update_updated_at();
create trigger event_vendor_needs_updated_at before update on event_vendor_needs
  for each row execute function update_updated_at();
create trigger event_workspace_settings_updated_at before update on event_workspace_settings
  for each row execute function update_updated_at();

alter table event_organizers enable row level security;
alter table event_tasks enable row level security;
alter table event_timeline_items enable row level security;
alter table budget_categories enable row level security;
alter table sponsorship_categories enable row level security;
alter table event_modules enable row level security;
alter table committee_roles enable row level security;
alter table event_vendor_needs enable row level security;
alter table event_workspace_settings enable row level security;

create policy "owners manage organizers" on event_organizers for all
  using (exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from events e where e.id = event_id and e.owner_id = auth.uid()));
create policy "active organizers can read organizers" on event_organizers for select
  using (can_manage_event(event_id));

create policy "managers manage event tasks" on event_tasks for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "managers manage event timeline items" on event_timeline_items for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "managers manage budget categories" on budget_categories for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "managers manage sponsorship categories" on sponsorship_categories for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "public sponsorship categories visible" on sponsorship_categories for select
  using (exists (select 1 from events e where e.id = occasion_id and e.is_public = true));
create policy "managers manage event modules" on event_modules for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "managers manage committee roles" on committee_roles for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "managers manage vendor needs" on event_vendor_needs for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "managers manage workspace settings" on event_workspace_settings for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
