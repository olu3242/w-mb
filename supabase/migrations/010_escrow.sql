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
