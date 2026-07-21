-- Harmony Haven cloud-first shared household state
-- Run after 001_initial.sql and 002_storage_management.sql

create table if not exists public.household_app_state (
  household_id uuid primary key references public.households(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_by_profile_id uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create index if not exists household_app_state_updated_at_idx
  on public.household_app_state(updated_at desc);

alter table public.household_app_state enable row level security;

create policy "household state same household read"
on public.household_app_state for select
using (
  household_id = (
    select p.household_id from public.profiles p
    where p.id = public.current_profile_id()
  )
);

create policy "household state same household insert"
on public.household_app_state for insert
with check (
  household_id = (
    select p.household_id from public.profiles p
    where p.id = public.current_profile_id()
  )
);

create policy "household state same household update"
on public.household_app_state for update
using (
  household_id = (
    select p.household_id from public.profiles p
    where p.id = public.current_profile_id()
  )
)
with check (
  household_id = (
    select p.household_id from public.profiles p
    where p.id = public.current_profile_id()
  )
);

create or replace function public.touch_household_app_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.version = coalesce(old.version, 0) + 1;
  return new;
end $$;

drop trigger if exists trg_touch_household_app_state on public.household_app_state;
create trigger trg_touch_household_app_state
before update on public.household_app_state
for each row execute function public.touch_household_app_state();
