create table if not exists event_invitations (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  invitation_type text not null,
  source_type text not null default 'designed'
    check (source_type in ('designed', 'uploaded', 'ai_generated')),
  title text not null,
  subtitle text,
  body text,
  host_names text,
  venue_name text,
  venue_address text,
  dress_code text,
  rsvp_note text,
  support_note text,
  template_id text,
  theme_id text,
  design_json jsonb not null default '{}',
  file_url text,
  preview_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_announcements (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  announcement_type text not null,
  priority text not null default 'normal'
    check (priority in ('normal', 'important', 'urgent')),
  visibility text not null default 'public'
    check (visibility in ('public', 'guests_only', 'committee_only')),
  pinned boolean not null default false,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  share_to_public_page boolean not null default true,
  share_to_whatsapp_ready boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references event_announcements(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  read_at timestamptz not null default now()
);

create table if not exists invitation_templates (
  id text primary key,
  occasion_type text,
  name text not null,
  description text,
  design_json jsonb not null default '{}',
  is_active boolean not null default true
);

insert into invitation_templates (id, occasion_type, name, description, design_json) values
  ('luxe_wedding', 'wedding_owambe', 'Luxe Wedding', 'Premium wording and polished details for wedding celebrations.', '{"theme":"gold_luxe"}'),
  ('owambe_classic', 'wedding_owambe', 'Owambe Classic', 'Warm, social, and celebratory for high-energy gatherings.', '{"theme":"asoebi_joy"}'),
  ('memorial_calm', 'funeral_memorial', 'Memorial Calm', 'Respectful remembrance wording for funeral and memorial services.', '{"theme":"memorial_calm"}'),
  ('birthday_glow', 'birthday', 'Birthday Glow', 'Bright and inviting for birthday parties.', '{"theme":"birthday_glow"}'),
  ('church_gathering', 'church_community', 'Church Gathering', 'Graceful copy for church and community events.', '{"theme":"church_gathering"}'),
  ('community_support', 'emergency_support', 'Community Support', 'Clear, caring language for support announcements.', '{"theme":"community_support"}'),
  ('baby_soft', 'baby_shower', 'Baby Soft', 'Gentle invitation style for baby showers and naming ceremonies.', '{"theme":"baby_soft"}'),
  ('custom_minimal', 'custom', 'Custom Minimal', 'A clean, flexible invitation for any occasion.', '{"theme":"custom_minimal"}')
on conflict (id) do nothing;

create index if not exists event_invitations_occasion_active_idx on event_invitations (occasion_id, is_active, created_at desc);
create index if not exists event_announcements_public_idx on event_announcements (occasion_id, visibility, publish_at, expires_at);
create index if not exists event_announcements_pinned_idx on event_announcements (occasion_id, pinned, priority);

drop trigger if exists event_invitations_updated_at on event_invitations;
create trigger event_invitations_updated_at before update on event_invitations
  for each row execute function update_updated_at();

drop trigger if exists event_announcements_updated_at on event_announcements;
create trigger event_announcements_updated_at before update on event_announcements
  for each row execute function update_updated_at();

alter table event_invitations enable row level security;
alter table event_announcements enable row level security;
alter table announcement_reads enable row level security;
alter table invitation_templates enable row level security;

create policy "event ops manage invitations" on event_invitations for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id) and created_by = auth.uid());

create policy "public active invitations visible" on event_invitations for select
  using (
    is_active = true
    and exists (select 1 from events e where e.id = occasion_id and e.is_public = true)
  );

create policy "event ops manage event announcements" on event_announcements for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id) and created_by = auth.uid());

create policy "public event announcements visible" on event_announcements for select
  using (
    visibility = 'public'
    and share_to_public_page = true
    and publish_at <= now()
    and (expires_at is null or expires_at > now())
    and exists (select 1 from events e where e.id = occasion_id and e.is_public = true)
  );

create policy "guests read guest announcements" on event_announcements for select
  using (
    visibility = 'guests_only'
    and publish_at <= now()
    and (expires_at is null or expires_at > now())
    and exists (
      select 1 from event_guests eg
      where eg.occasion_id = event_announcements.occasion_id
        and (eg.email = auth.email() or eg.invited_by = auth.uid())
    )
  );

create policy "committee reads committee announcements" on event_announcements for select
  using (visibility = 'committee_only' and can_view_event_ops(occasion_id));

create policy "users manage own announcement reads" on announcement_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "active invitation templates visible" on invitation_templates for select
  using (is_active = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-invitations',
  'event-invitations',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "event ops upload invitation assets" on storage.objects for insert
  with check (
    bucket_id = 'event-invitations'
    and can_view_event_ops(((storage.foldername(name))[1])::uuid)
  );

create policy "event ops update invitation assets" on storage.objects for update
  using (
    bucket_id = 'event-invitations'
    and can_view_event_ops(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'event-invitations'
    and can_view_event_ops(((storage.foldername(name))[1])::uuid)
  );

create policy "event ops delete invitation assets" on storage.objects for delete
  using (
    bucket_id = 'event-invitations'
    and can_view_event_ops(((storage.foldername(name))[1])::uuid)
  );

create policy "public reads active invitation assets" on storage.objects for select
  using (
    bucket_id = 'event-invitations'
    and (
      can_view_event_ops(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1
        from event_invitations ei
        join events e on e.id = ei.occasion_id
        where ei.occasion_id = ((storage.foldername(name))[1])::uuid
          and ei.is_active = true
          and e.is_public = true
          and (ei.file_url like '%' || storage.objects.name or ei.preview_url like '%' || storage.objects.name)
      )
    )
  );
