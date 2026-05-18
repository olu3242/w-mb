alter table contributions
  add column if not exists occasion_id uuid references events(id) on delete cascade,
  add column if not exists sponsorship_category_id uuid references sponsorship_categories(id) on delete set null,
  add column if not exists contributor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists currency text not null default 'USD',
  add column if not exists is_anonymous boolean not null default false;

alter table contributions
  alter column gift_item_id drop not null,
  alter column contributor_email drop not null,
  alter column stripe_payment_intent_id drop not null;

update contributions set occasion_id = event_id where occasion_id is null;

create or replace function increment_sponsorship_funded_amount(p_category_id uuid, p_amount numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update sponsorship_categories
  set funded_amount = funded_amount + p_amount
  where id = p_category_id;
$$;

create table if not exists vendor_directory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null,
  city text,
  country text,
  description text,
  rating numeric,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists vendor_inquiries (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  vendor_id uuid not null references vendor_directory(id) on delete cascade,
  organizer_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  event_date timestamptz,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists memory_posts (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  author_name text not null,
  author_user_id uuid references auth.users(id) on delete set null,
  message text not null,
  post_type text not null default 'message',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

insert into vendor_directory (name, category, city, country, description, rating, is_verified)
values
  ('Aso Rock Events Hall', 'venue', 'Houston', 'USA', 'Flexible event space for weddings, memorials, and community gatherings.', 4.8, true),
  ('Jollof & Co Catering', 'caterer', 'Dallas', 'USA', 'West African catering packages with buffet, plated, and family service options.', 4.7, true),
  ('Bloomline Decor Studio', 'decorator', 'Atlanta', 'USA', 'Ceremony, reception, floral, and memorial decor styling.', 4.6, false),
  ('Kemi Lens Photography', 'photographer', 'Chicago', 'USA', 'Event photography for celebrations, ceremonies, and tribute services.', 4.9, true),
  ('DJ Bayo Live', 'DJ/live band', 'New York', 'USA', 'DJ and live entertainment packages for high-energy receptions.', 4.5, false),
  ('Grace Memorial Printing', 'program printer', 'Houston', 'USA', 'Obituary, memorial program, and keepsake printing support.', 4.8, true),
  ('Peace Transit Services', 'transportation', 'Dallas', 'USA', 'Family, guest, and event logistics transportation.', 4.4, false)
on conflict do nothing;

alter table vendor_directory enable row level security;
alter table vendor_inquiries enable row level security;
alter table memory_posts enable row level security;

create policy "public vendor directory visible" on vendor_directory for select using (true);
create policy "vendor owners manage directory" on vendor_directory for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "managers create vendor inquiries" on vendor_inquiries for insert
  with check (can_manage_event(occasion_id) and organizer_id = auth.uid());
create policy "managers read vendor inquiries" on vendor_inquiries for select
  using (can_manage_event(occasion_id));
create policy "managers update vendor inquiries" on vendor_inquiries for update
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));
create policy "vendor owner reads inquiries" on vendor_inquiries for select
  using (exists (
    select 1 from vendor_directory vd
    where vd.id = vendor_id and vd.owner_id = auth.uid()
  ));

create policy "public memory posts visible" on memory_posts for select
  using (
    is_public = true
    and exists (select 1 from events e where e.id = occasion_id and e.is_public = true)
  );
create policy "anyone can add public memory post" on memory_posts for insert
  with check (
    is_public = true
    and exists (select 1 from events e where e.id = occasion_id and e.is_public = true)
  );
create policy "managers manage memory posts" on memory_posts for all
  using (can_manage_event(occasion_id))
  with check (can_manage_event(occasion_id));

create policy "public pledged contributions visible" on contributions for select
  using (
    status in ('pledged', 'pending', 'succeeded')
    and exists (select 1 from events e where e.id = coalesce(occasion_id, event_id) and e.is_public = true)
  );
