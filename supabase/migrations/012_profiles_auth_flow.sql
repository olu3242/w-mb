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
