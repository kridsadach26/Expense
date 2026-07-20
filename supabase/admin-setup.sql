-- 1) สร้าง Admin User ใน Supabase Authentication > Users ก่อน
-- 2) คัดลอก User UUID
-- 3) แทนค่า ADMIN_AUTH_USER_UUID แล้วรันไฟล์นี้

insert into public.admin_users (user_id)
values ('ADMIN_AUTH_USER_UUID')
on conflict (user_id) do nothing;
