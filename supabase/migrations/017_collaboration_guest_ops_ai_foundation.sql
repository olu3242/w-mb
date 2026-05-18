create table if not exists committee_members (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete set null,
  email text,
  name text,
  role text not null default 'co_organizer'
    check (role in ('organizer', 'finance_lead', 'logistics_lead', 'welfare_coordinator', 'vendor_coordinator', 'guest_coordinator', 'memorial_coordinator', 'co_organizer')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'removed')),
  permissions jsonb not null default '[]',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists guest_groups (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists event_guests (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  group_id uuid references guest_groups(id) on delete set null,
  name text not null,
  email text,
  phone text,
  guest_count int not null default 1,
  invitation_token uuid not null default gen_random_uuid(),
  status text not null default 'invited'
    check (status in ('invited', 'accepted', 'declined', 'maybe')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_rsvps (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  guest_id uuid references event_guests(id) on delete cascade,
  status text not null
    check (status in ('accepted', 'declined', 'maybe')),
  attendee_count int not null default 1,
  note text,
  responded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  title text not null,
  body text not null,
  audience text not null default 'guests'
    check (audience in ('guests', 'committee', 'contributors', 'public')),
  channel text not null default 'in_app'
    check (channel in ('in_app', 'email', 'whatsapp_ready')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists event_updates (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  title text not null,
  body text not null,
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid references events(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  recipient_email text,
  channel text not null default 'in_app'
    check (channel in ('in_app', 'email', 'whatsapp_ready')),
  notification_type text not null,
  title text not null,
  body text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'read')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists activity_feed (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  activity_type text not null,
  title text not null,
  body text,
  visibility text not null default 'organizers'
    check (visibility in ('organizers', 'committee', 'public')),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  occasion_id uuid not null references events(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists ai_context_memories (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  memory_type text not null,
  content jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create trigger event_guests_updated_at before update on event_guests
  for each row execute function update_updated_at();

create or replace function can_view_event_ops(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select can_manage_event(p_event_id)
  or exists (
    select 1 from committee_members cm
    where cm.occasion_id = p_event_id
      and cm.member_user_id = auth.uid()
      and cm.status = 'active'
  );
$$;

alter table committee_members enable row level security;
alter table guest_groups enable row level security;
alter table event_guests enable row level security;
alter table event_rsvps enable row level security;
alter table announcements enable row level security;
alter table event_updates enable row level security;
alter table notifications enable row level security;
alter table activity_feed enable row level security;
alter table task_comments enable row level security;
alter table ai_context_memories enable row level security;

create policy "managers manage committee members" on committee_members for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "committee members read committee" on committee_members for select
  using (can_view_event_ops(occasion_id));

create policy "ops manage guest groups" on guest_groups for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "ops manage guests" on event_guests for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));

create policy "ops read rsvps" on event_rsvps for select using (can_view_event_ops(occasion_id));

create policy "ops manage announcements" on announcements for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "public event updates visible" on event_updates for select
  using (is_public = true and exists (select 1 from events e where e.id = occasion_id and e.is_public = true));
create policy "ops manage event updates" on event_updates for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));

create policy "recipient reads notifications" on notifications for select
  using (recipient_user_id = auth.uid() or can_view_event_ops(occasion_id));
create policy "ops manage notifications" on notifications for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));

create policy "ops read activity" on activity_feed for select using (can_view_event_ops(occasion_id));
create policy "public activity visible" on activity_feed for select
  using (visibility = 'public' and exists (select 1 from events e where e.id = occasion_id and e.is_public = true));
create policy "ops insert activity" on activity_feed for insert with check (can_view_event_ops(occasion_id));

create policy "ops manage task comments" on task_comments for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
create policy "ops manage ai context" on ai_context_memories for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));
