create table if not exists event_gallery_sections (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  section_type text not null
    check (section_type in ('pre_party', 'main_event', 'post_party', 'custom')),
  visibility text not null default 'public'
    check (visibility in ('public', 'guests_only', 'committee_only', 'private')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists event_gallery_media (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  gallery_section_id uuid references event_gallery_sections(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploader_name text,
  media_type text not null
    check (media_type in ('image', 'video')),
  file_url text not null,
  thumbnail_url text,
  caption text,
  visibility text not null default 'public'
    check (visibility in ('public', 'guests_only', 'committee_only', 'private')),
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_gallery_sections_event_idx
  on event_gallery_sections (occasion_id, is_active, sort_order, created_at);
create index if not exists event_gallery_media_event_idx
  on event_gallery_media (occasion_id, gallery_section_id, moderation_status, visibility, sort_order, created_at desc);

drop trigger if exists event_gallery_sections_updated_at on event_gallery_sections;
create trigger event_gallery_sections_updated_at before update on event_gallery_sections
  for each row execute function update_updated_at();

alter table event_gallery_sections enable row level security;
alter table event_gallery_media enable row level security;

create policy "event ops manage gallery sections" on event_gallery_sections for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id) and created_by = auth.uid());

create policy "public gallery sections visible" on event_gallery_sections for select
  using (
    is_active = true
    and visibility = 'public'
    and exists (select 1 from events e where e.id = occasion_id and e.is_public = true)
  );

create policy "guests read guest gallery sections" on event_gallery_sections for select
  using (
    is_active = true
    and visibility = 'guests_only'
    and exists (
      select 1 from event_guests eg
      where eg.occasion_id = event_gallery_sections.occasion_id
        and (eg.email = auth.email() or eg.invited_by = auth.uid())
    )
  );

create policy "committee reads committee gallery sections" on event_gallery_sections for select
  using (is_active = true and visibility = 'committee_only' and can_view_event_ops(occasion_id));

create policy "event ops manage gallery media" on event_gallery_media for all
  using (can_view_event_ops(occasion_id))
  with check (can_view_event_ops(occasion_id));

create policy "public gallery media visible" on event_gallery_media for select
  using (
    visibility = 'public'
    and moderation_status = 'approved'
    and exists (select 1 from events e where e.id = occasion_id and e.is_public = true)
  );

create policy "guests read guest gallery media" on event_gallery_media for select
  using (
    visibility = 'guests_only'
    and moderation_status = 'approved'
    and exists (
      select 1 from event_guests eg
      where eg.occasion_id = event_gallery_media.occasion_id
        and (eg.email = auth.email() or eg.invited_by = auth.uid())
    )
  );

create policy "committee reads committee gallery media" on event_gallery_media for select
  using (visibility = 'committee_only' and moderation_status = 'approved' and can_view_event_ops(occasion_id));

create policy "public can add gallery media to public events" on event_gallery_media for insert
  with check (
    visibility = 'public'
    and moderation_status in ('pending', 'approved')
    and exists (select 1 from events e where e.id = occasion_id and e.is_public = true)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-gallery',
  'event-gallery',
  false,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "event ops upload gallery assets" on storage.objects for insert
  with check (
    bucket_id = 'event-gallery'
    and can_view_event_ops(((storage.foldername(name))[1])::uuid)
  );

create policy "event ops update gallery assets" on storage.objects for update
  using (
    bucket_id = 'event-gallery'
    and can_view_event_ops(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'event-gallery'
    and can_view_event_ops(((storage.foldername(name))[1])::uuid)
  );

create policy "event ops delete gallery assets" on storage.objects for delete
  using (
    bucket_id = 'event-gallery'
    and can_view_event_ops(((storage.foldername(name))[1])::uuid)
  );
