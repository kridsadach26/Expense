-- Expense Orbit / Home Expense PIN fix for Supabase
-- แก้ error: function gen_salt(unknown) does not exist
-- รันไฟล์นี้ใน SQL Editor แล้วกด Run

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_initial_profile_pin(
  p_profile_id uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target public.profiles;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'message', 'ไม่พบ Supabase session');
  end if;

  if p_pin !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'message', 'PIN ต้องเป็นตัวเลข 6 หลัก');
  end if;

  select * into target
  from public.profiles
  where id = p_profile_id and active = true
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'ไม่พบผู้ใช้');
  end if;

  if target.pin_hash is not null then
    return jsonb_build_object('ok', false, 'message', 'ผู้ใช้นี้ตั้ง PIN แล้ว');
  end if;

  update public.profiles
  set
    pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
    failed_attempts = 0,
    locked_until = null
  where id = p_profile_id;

  insert into public.device_sessions(auth_user_id, profile_id, verified_at)
  values (auth.uid(), p_profile_id, now())
  on conflict (auth_user_id)
  do update set profile_id = excluded.profile_id, verified_at = now();

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.login_with_profile_pin(
  p_profile_id uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target public.profiles;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'message', 'ไม่พบ Supabase session');
  end if;

  select * into target
  from public.profiles
  where id = p_profile_id and active = true
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'ไม่พบผู้ใช้');
  end if;

  if target.locked_until is not null and target.locked_until > now() then
    return jsonb_build_object('ok', false, 'message', 'PIN ถูกล็อกชั่วคราว กรุณารอ 5 นาที');
  end if;

  if target.pin_hash is null or extensions.crypt(p_pin, target.pin_hash) <> target.pin_hash then
    update public.profiles
    set
      failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else null end
    where id = p_profile_id;

    return jsonb_build_object('ok', false, 'message', 'PIN ไม่ถูกต้อง');
  end if;

  update public.profiles
  set failed_attempts = 0, locked_until = null
  where id = p_profile_id;

  insert into public.device_sessions(auth_user_id, profile_id, verified_at)
  values (auth.uid(), p_profile_id, now())
  on conflict (auth_user_id)
  do update set profile_id = excluded.profile_id, verified_at = now();

  return jsonb_build_object('ok', true);
end $$;

create or replace function public.change_profile_pin(
  p_old_pin text,
  p_new_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  pid uuid := public.current_profile_id();
  target public.profiles;
begin
  if pid is null then
    return jsonb_build_object('ok', false, 'message', 'ยังไม่ได้เข้าสู่ระบบ');
  end if;

  if p_new_pin !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'message', 'PIN ใหม่ต้องเป็นตัวเลข 6 หลัก');
  end if;

  select * into target
  from public.profiles
  where id = pid
  for update;

  if target.pin_hash is null or extensions.crypt(p_old_pin, target.pin_hash) <> target.pin_hash then
    return jsonb_build_object('ok', false, 'message', 'PIN เดิมไม่ถูกต้อง');
  end if;

  update public.profiles
  set
    pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf')),
    failed_attempts = 0,
    locked_until = null
  where id = pid;

  return jsonb_build_object('ok', true, 'message', 'เปลี่ยน PIN แล้ว');
end $$;

select 'pin functions updated' as result;
