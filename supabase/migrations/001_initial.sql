create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'บ้านเรา',
  base_currency text not null default 'THB',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null check (role in ('admin','member')) default 'member',
  pin_hash text,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.device_sessions (
  auth_user_id uuid primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  verified_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense','both')) default 'expense',
  active boolean not null default true
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  payer_profile_id uuid references public.profiles(id),
  entry_type text not null check (entry_type in ('income','expense','transfer')),
  entry_date date not null,
  merchant text not null,
  category_id uuid references public.categories(id),
  amount numeric(18,2) not null check (amount >= 0),
  currency text not null default 'THB',
  exchange_rate_to_thb numeric(18,8) not null default 1,
  amount_thb numeric(18,2) generated always as (round(amount * exchange_rate_to_thb, 2)) stored,
  payment_method text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.entry_attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.entry_shares (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  person_name text not null,
  amount_thb numeric(18,2) not null check (amount_thb >= 0),
  paid_back boolean not null default false
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  base_currency text not null default 'THB',
  status text not null check (status in ('active','closed','cancelled')) default 'active',
  share_token text unique default encode(gen_random_bytes(24), 'hex'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(project_id, name)
);

create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  payer_member_id uuid not null references public.project_members(id),
  submitted_by_profile_id uuid references public.profiles(id),
  submitted_by_member_id uuid references public.project_members(id),
  status text not null check (status in ('pending','approved','rejected')) default 'approved',
  expense_date date not null,
  title text not null,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null,
  exchange_rate_to_base numeric(18,8) not null default 1,
  base_amount numeric(18,2) generated always as (round(amount * exchange_rate_to_base, 2)) stored,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.project_expenses(id) on delete cascade,
  member_id uuid not null references public.project_members(id),
  amount_base numeric(18,2) not null check (amount_base >= 0)
);

create table if not exists public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.project_expenses(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select profile_id from public.device_sessions where auth_user_id = auth.uid()
$$;

create or replace function public.current_app_profile()
returns table(profile_id uuid, display_name text, role text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.role
  from public.device_sessions ds
  join public.profiles p on p.id = ds.profile_id
  where ds.auth_user_id = auth.uid() and p.active = true
$$;

create or replace function public.list_login_profiles()
returns table(id uuid, display_name text, avatar_url text, role text, pin_is_set boolean, active boolean)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_url, p.role, (p.pin_hash is not null), p.active
  from public.profiles p
  where p.active = true
  order by p.created_at
$$;

create or replace function public.set_initial_profile_pin(p_profile_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'message', 'ไม่มี session ของอุปกรณ์'); end if;
  if p_pin !~ '^[0-9]{6}$' then return jsonb_build_object('ok', false, 'message', 'PIN ต้องเป็นตัวเลข 6 หลัก'); end if;

  select * into target from public.profiles where id = p_profile_id and active = true for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'ไม่พบผู้ใช้'); end if;
  if target.pin_hash is not null then return jsonb_build_object('ok', false, 'message', 'ผู้ใช้นี้ตั้ง PIN แล้ว'); end if;

  update public.profiles set pin_hash = crypt(p_pin, gen_salt('bf')), failed_attempts = 0, locked_until = null where id = p_profile_id;
  insert into public.device_sessions(auth_user_id, profile_id) values(auth.uid(), p_profile_id)
  on conflict(auth_user_id) do update set profile_id = excluded.profile_id, verified_at = now();

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.login_with_profile_pin(p_profile_id uuid, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'message', 'ไม่มี session ของอุปกรณ์'); end if;
  select * into target from public.profiles where id = p_profile_id and active = true for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'ไม่พบผู้ใช้'); end if;

  if target.locked_until is not null and target.locked_until > now() then
    return jsonb_build_object('ok', false, 'message', 'PIN ถูกล็อกชั่วคราว กรุณารอแล้วลองใหม่');
  end if;

  if target.pin_hash is null or crypt(p_pin, target.pin_hash) <> target.pin_hash then
    update public.profiles
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else null end
    where id = p_profile_id;
    return jsonb_build_object('ok', false, 'message', 'PIN ไม่ถูกต้อง');
  end if;

  update public.profiles set failed_attempts = 0, locked_until = null where id = p_profile_id;
  insert into public.device_sessions(auth_user_id, profile_id) values(auth.uid(), p_profile_id)
  on conflict(auth_user_id) do update set profile_id = excluded.profile_id, verified_at = now();

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.logout_app_profile()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.device_sessions where auth_user_id = auth.uid()
$$;

create or replace function public.change_profile_pin(p_old_pin text, p_new_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid := public.current_profile_id();
  target public.profiles;
begin
  if pid is null then return jsonb_build_object('ok', false, 'message', 'ยังไม่ได้เข้าสู่ระบบ'); end if;
  if p_new_pin !~ '^[0-9]{6}$' then return jsonb_build_object('ok', false, 'message', 'PIN ใหม่ต้องเป็นตัวเลข 6 หลัก'); end if;

  select * into target from public.profiles where id = pid for update;
  if crypt(p_old_pin, target.pin_hash) <> target.pin_hash then
    return jsonb_build_object('ok', false, 'message', 'PIN เดิมไม่ถูกต้อง');
  end if;

  update public.profiles set pin_hash = crypt(p_new_pin, gen_salt('bf')), failed_attempts = 0, locked_until = null where id = pid;
  return jsonb_build_object('ok', true, 'message', 'เปลี่ยน PIN แล้ว');
end $$;

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.admin_users where user_id = auth.uid()
  )
$$;

create or replace function public.admin_list_profiles()
returns table(id uuid, display_name text, avatar_url text, role text, pin_is_set boolean, active boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'ไม่มีสิทธิ์ Admin';
  end if;

  return query
  select p.id, p.display_name, p.avatar_url, p.role, (p.pin_hash is not null), p.active
  from public.profiles p
  order by p.created_at;
end $$;

create or replace function public.admin_reset_profile_pin(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    return jsonb_build_object('ok', false, 'message', 'ไม่มีสิทธิ์ Admin');
  end if;

  if not exists(select 1 from public.profiles where id = p_profile_id) then
    return jsonb_build_object('ok', false, 'message', 'ไม่พบผู้ใช้');
  end if;

  update public.profiles
  set pin_hash = null, failed_attempts = 0, locked_until = null
  where id = p_profile_id;

  delete from public.device_sessions where profile_id = p_profile_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_set_profile_active(p_profile_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    return jsonb_build_object('ok', false, 'message', 'ไม่มีสิทธิ์ Admin');
  end if;

  if not exists(select 1 from public.profiles where id = p_profile_id) then
    return jsonb_build_object('ok', false, 'message', 'ไม่พบผู้ใช้');
  end if;

  update public.profiles set active = p_active where id = p_profile_id;

  if not p_active then
    delete from public.device_sessions where profile_id = p_profile_id;
  end if;

  return jsonb_build_object('ok', true);
end $$;

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.device_sessions enable row level security;
alter table public.categories enable row level security;
alter table public.entries enable row level security;
alter table public.entry_attachments enable row level security;
alter table public.entry_shares enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_expenses enable row level security;
alter table public.project_expense_shares enable row level security;
alter table public.project_attachments enable row level security;

create policy "admin can read own role" on public.admin_users
for select using (user_id = auth.uid());

create policy "profiles same household read" on public.profiles
for select using (
  household_id = (select household_id from public.profiles where id = public.current_profile_id())
);

create policy "entries same household all" on public.entries
for all using (
  household_id = (select household_id from public.profiles where id = public.current_profile_id())
) with check (
  household_id = (select household_id from public.profiles where id = public.current_profile_id())
);

create policy "projects same household all" on public.projects
for all using (
  household_id = (select household_id from public.profiles where id = public.current_profile_id())
) with check (
  household_id = (select household_id from public.profiles where id = public.current_profile_id())
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "receipt authenticated insert" on storage.objects
for insert to authenticated with check (bucket_id = 'receipts');

create policy "receipt authenticated read" on storage.objects
for select to authenticated using (bucket_id = 'receipts');
