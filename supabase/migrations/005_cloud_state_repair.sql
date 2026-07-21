-- Harmony Haven: Cloud State Repair
-- Safe to run more than once. Does not delete existing application data.

create extension if not exists pgcrypto;

-- Required core objects must already exist.
do $$
begin
  if to_regclass('public.households') is null then
    raise exception 'Missing public.households. Run the core Supabase setup/repair SQL first.';
  end if;
  if to_regclass('public.profiles') is null then
    raise exception 'Missing public.profiles. Run the core Supabase setup/repair SQL first.';
  end if;
end $$;

create table if not exists public.household_app_state (
  household_id uuid primary key references public.households(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_by_profile_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Repair columns for installations created from an older migration.
alter table public.household_app_state
  add column if not exists state jsonb not null default '{}'::jsonb,
  add column if not exists version bigint not null default 1,
  add column if not exists updated_by_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists household_app_state_updated_at_idx
  on public.household_app_state(updated_at desc);

create or replace function public.touch_household_app_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  new.version = coalesce(old.version, 0) + 1;
  return new;
end;
$$;

drop trigger if exists trg_touch_household_app_state on public.household_app_state;
create trigger trg_touch_household_app_state
before update on public.household_app_state
for each row execute function public.touch_household_app_state();

alter table public.household_app_state enable row level security;

drop policy if exists "household state same household read" on public.household_app_state;
drop policy if exists "household state same household insert" on public.household_app_state;
drop policy if exists "household state same household update" on public.household_app_state;
drop policy if exists "household state same household delete" on public.household_app_state;

-- These policies are used by authenticated clients. The server API uses service_role.
create policy "household state same household read"
on public.household_app_state for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = public.current_profile_id()
      and p.household_id = household_app_state.household_id
  )
);

create policy "household state same household insert"
on public.household_app_state for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = public.current_profile_id()
      and p.household_id = household_app_state.household_id
  )
);

create policy "household state same household update"
on public.household_app_state for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = public.current_profile_id()
      and p.household_id = household_app_state.household_id
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = public.current_profile_id()
      and p.household_id = household_app_state.household_id
  )
);

create policy "household state same household delete"
on public.household_app_state for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = public.current_profile_id()
      and p.household_id = household_app_state.household_id
  )
);

grant select, insert, update, delete on public.household_app_state to authenticated;
grant all on public.household_app_state to service_role;

-- Calendar support tables (safe repair; the current UI still stores calendar data in cloud state JSON).
create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(), household_id uuid not null,
  created_by uuid, name text not null,
  item_type text not null check (item_type in ('bill','task','event')),
  priority text not null default 'normal', due_date date not null, due_time time,
  amount numeric(14,2) default 0, category text, repeat_rule text not null default 'none',
  remind_days integer not null default 0, assignee_ids uuid[] not null default '{}', project_id uuid,
  payment_method text, note text, status text not null default 'pending',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(), household_id uuid not null, recipient_id uuid not null,
  calendar_item_id uuid, title text not null, body text, scheduled_for timestamptz, read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, endpoint text not null unique,
  p256dh text not null, auth text not null, user_agent text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.calendar_items enable row level security;
alter table public.app_notifications enable row level security;
alter table public.push_subscriptions enable row level security;

-- Verification result. A successful run returns one row with cloud_state_table = household_app_state.
select
  to_regclass('public.household_app_state')::text as cloud_state_table,
  (select count(*) from public.households) as household_count,
  (select count(*) from public.profiles) as profile_count;
