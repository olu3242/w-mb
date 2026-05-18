alter table profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'support', 'admin'));

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'support')
  );
$$;

alter table contributions
  add column if not exists payment_provider text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_payment_intent_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table contributions
  alter column occasion_id set not null,
  alter column status set default 'pending';

update contributions set status = 'paid' where status = 'succeeded';
update contributions set status = 'pending' where status not in ('pledged', 'pending', 'paid', 'failed', 'refunded', 'disputed', 'cancelled');

do $$
begin
  alter table contributions
    add constraint contributions_status_check
    check (status in ('pledged', 'pending', 'paid', 'failed', 'refunded', 'disputed', 'cancelled'));
exception
  when duplicate_object then null;
end $$;

drop trigger if exists contributions_updated_at on contributions;
create trigger contributions_updated_at before update on contributions
  for each row execute function update_updated_at();

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  contribution_id uuid references contributions(id) on delete set null,
  provider text not null,
  provider_transaction_id text,
  transaction_type text not null
    check (transaction_type in ('contribution', 'refund', 'fee', 'payout', 'adjustment')),
  amount numeric not null,
  currency text not null default 'USD',
  status text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists payout_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_account_id text,
  status text not null default 'not_started',
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  requirements_due jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);

create table if not exists admin_reviews (
  id uuid primary key default gen_random_uuid(),
  subject_type text,
  subject_id uuid,
  review_type text,
  status text not null default 'open',
  priority text not null default 'medium',
  assigned_to uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists payout_requests (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references events(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending_review',
  trust_status text not null default 'pending',
  admin_review_id uuid references admin_reviews(id) on delete set null,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  paid_at timestamptz,
  rejection_reason text
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

drop trigger if exists payout_accounts_updated_at on payout_accounts;
create trigger payout_accounts_updated_at before update on payout_accounts
  for each row execute function update_updated_at();

create or replace function increment_sponsorship_funded_amount_once(p_category_id uuid, p_amount numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update sponsorship_categories
  set funded_amount = funded_amount + p_amount
  where id = p_category_id;
$$;

create or replace function get_public_contribution_summaries(p_occasion_id uuid, p_limit int default 6)
returns table (
  id uuid,
  display_name text,
  amount numeric,
  message text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    case when c.is_anonymous then 'Anonymous supporter' else c.contributor_name end as display_name,
    c.amount,
    c.message,
    c.status,
    c.created_at
  from contributions c
  join events e on e.id = c.occasion_id
  where c.occasion_id = p_occasion_id
    and e.is_public = true
    and c.status in ('paid', 'pledged')
  order by c.created_at desc
  limit p_limit;
$$;

drop policy if exists "anyone can insert contribution" on contributions;
drop policy if exists "public pledged contributions visible" on contributions;
drop policy if exists "event owner reads contributions" on contributions;

create policy "managers read contributions" on contributions for select
  using (can_manage_event(occasion_id));
create policy "contributors read own contributions" on contributions for select
  using (contributor_user_id = auth.uid());

alter table payment_events enable row level security;
alter table transactions enable row level security;
alter table payout_accounts enable row level security;
alter table payout_requests enable row level security;
alter table admin_reviews enable row level security;
alter table audit_logs enable row level security;

create policy "admins manage payment events" on payment_events for all using (is_admin()) with check (is_admin());
create policy "managers read transactions" on transactions for select using (can_manage_event(occasion_id) or is_admin());
create policy "admins manage transactions" on transactions for all using (is_admin()) with check (is_admin());

create policy "owners manage payout accounts" on payout_accounts for all
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

create policy "managers read payout requests" on payout_requests for select
  using (can_manage_event(occasion_id) or is_admin());
create policy "managers create payout requests" on payout_requests for insert
  with check (can_manage_event(occasion_id) and requested_by = auth.uid());
create policy "admins update payout requests" on payout_requests for update
  using (is_admin())
  with check (is_admin());

create policy "admins manage reviews" on admin_reviews for all using (is_admin()) with check (is_admin());
create policy "admins read audit logs" on audit_logs for select using (is_admin());
create policy "admins insert audit logs" on audit_logs for insert with check (is_admin());
