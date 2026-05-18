create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  organization_type text not null
    check (organization_type in ('church', 'mosque', 'alumni_association', 'cultural_association', 'welfare_group', 'extended_family_house', 'nonprofit', 'community_organization', 'social_club')),
  logo_url text,
  description text,
  country text,
  timezone text not null default 'UTC',
  settings jsonb not null default '{}',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'member'
    check (role in ('admin', 'finance', 'welfare', 'logistics', 'coordinator', 'member')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'removed')),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists organization_events (
  organization_id uuid not null references organizations(id) on delete cascade,
  occasion_id uuid not null references events(id) on delete cascade,
  recurrence_rule text,
  recurrence_label text,
  created_at timestamptz not null default now(),
  primary key (organization_id, occasion_id)
);

create table if not exists organization_announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  body text not null,
  visibility text not null default 'members'
    check (visibility in ('members', 'leaders', 'public')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists organization_funds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  fund_type text not null
    check (fund_type in ('welfare_support', 'emergency_relief', 'building', 'education_support', 'burial_support', 'general')),
  balance numeric not null default 0,
  visibility text not null default 'members'
    check (visibility in ('private', 'members', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  activity_type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists organization_ai_context (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  context_type text not null,
  content jsonb not null default '{}',
  generated_at timestamptz not null default now()
);

alter table vendor_directory
  add column if not exists profile_slug text unique,
  add column if not exists portfolio jsonb not null default '[]',
  add column if not exists pricing_min numeric,
  add column if not exists pricing_max numeric,
  add column if not exists availability jsonb not null default '{}',
  add column if not exists trust_score numeric not null default 50,
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'featured', 'promoted', 'premium')),
  add column if not exists subscription_status text not null default 'not_started'
    check (subscription_status in ('not_started', 'active', 'past_due', 'cancelled'));

create table if not exists vendor_service_packages (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendor_directory(id) on delete cascade,
  name text not null,
  description text,
  price_min numeric,
  price_max numeric,
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists vendor_crm_notes (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendor_directory(id) on delete cascade,
  inquiry_id uuid references vendor_inquiries(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists vendor_leads (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendor_directory(id) on delete cascade,
  inquiry_id uuid references vendor_inquiries(id) on delete set null,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'quoted', 'won', 'lost')),
  estimated_value numeric default 0,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vendor_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  tier text not null unique
    check (tier in ('free', 'featured', 'promoted', 'premium')),
  name text not null,
  monthly_price numeric not null default 0,
  features jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into vendor_subscription_plans (tier, name, monthly_price, features)
values
  ('free', 'Free Vendor', 0, '["Directory listing", "Inquiry inbox"]'),
  ('featured', 'Featured Vendor', 2900, '["Featured placement", "CRM notes", "Package highlights"]'),
  ('promoted', 'Promoted Listing', 7900, '["Promoted search placement", "Lead tracking", "Analytics"]'),
  ('premium', 'Premium Partner', 14900, '["Premium placement", "Trust badge", "Priority leads"]')
on conflict (tier) do nothing;

create or replace function can_manage_organization(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organizations o
    where o.id = p_org_id and o.created_by = auth.uid()
  )
  or exists (
    select 1 from organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('admin', 'finance', 'welfare', 'logistics', 'coordinator')
  );
$$;

create or replace function can_view_organization(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select can_manage_organization(p_org_id)
  or exists (
    select 1 from organization_members om
    where om.organization_id = p_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create trigger organization_funds_updated_at before update on organization_funds
  for each row execute function update_updated_at();
create trigger vendor_leads_updated_at before update on vendor_leads
  for each row execute function update_updated_at();

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_events enable row level security;
alter table organization_announcements enable row level security;
alter table organization_funds enable row level security;
alter table organization_activity enable row level security;
alter table organization_ai_context enable row level security;
alter table vendor_service_packages enable row level security;
alter table vendor_crm_notes enable row level security;
alter table vendor_leads enable row level security;
alter table vendor_subscription_plans enable row level security;

create policy "org creators and members read organizations" on organizations for select
  using (created_by = auth.uid() or can_view_organization(id));
create policy "authenticated users create organizations" on organizations for insert
  with check (created_by = auth.uid());
create policy "org managers update organizations" on organizations for update
  using (can_manage_organization(id))
  with check (can_manage_organization(id));

create policy "org managers manage members" on organization_members for all
  using (can_manage_organization(organization_id))
  with check (can_manage_organization(organization_id));
create policy "org members read members" on organization_members for select
  using (can_view_organization(organization_id));

create policy "org members read events" on organization_events for select
  using (can_view_organization(organization_id));
create policy "org managers manage events" on organization_events for all
  using (can_manage_organization(organization_id))
  with check (can_manage_organization(organization_id));

create policy "org members read announcements" on organization_announcements for select
  using (can_view_organization(organization_id) or visibility = 'public');
create policy "org managers manage announcements" on organization_announcements for all
  using (can_manage_organization(organization_id))
  with check (can_manage_organization(organization_id));

create policy "org members read visible funds" on organization_funds for select
  using (can_manage_organization(organization_id) or (visibility in ('members', 'public') and can_view_organization(organization_id)));
create policy "org finance manages funds" on organization_funds for all
  using (can_manage_organization(organization_id))
  with check (can_manage_organization(organization_id));

create policy "org members read activity" on organization_activity for select using (can_view_organization(organization_id));
create policy "org managers insert activity" on organization_activity for insert with check (can_manage_organization(organization_id));
create policy "org managers manage ai context" on organization_ai_context for all
  using (can_manage_organization(organization_id))
  with check (can_manage_organization(organization_id));

create policy "public reads vendor plans" on vendor_subscription_plans for select using (is_active = true);
create policy "vendor owners manage packages" on vendor_service_packages for all
  using (exists (select 1 from vendor_directory vd where vd.id = vendor_id and vd.owner_id = auth.uid()))
  with check (exists (select 1 from vendor_directory vd where vd.id = vendor_id and vd.owner_id = auth.uid()));
create policy "public reads active packages" on vendor_service_packages for select using (is_active = true);
create policy "vendor owners manage crm notes" on vendor_crm_notes for all
  using (exists (select 1 from vendor_directory vd where vd.id = vendor_id and vd.owner_id = auth.uid()))
  with check (exists (select 1 from vendor_directory vd where vd.id = vendor_id and vd.owner_id = auth.uid()));
create policy "vendor owners manage leads" on vendor_leads for all
  using (exists (select 1 from vendor_directory vd where vd.id = vendor_id and vd.owner_id = auth.uid()))
  with check (exists (select 1 from vendor_directory vd where vd.id = vendor_id and vd.owner_id = auth.uid()));
