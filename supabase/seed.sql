do $$
declare
  hh uuid;
begin
  insert into public.households(name, base_currency)
  values ('บ้านเรา', 'THB')
  returning id into hh;

  insert into public.profiles(household_id, display_name, role)
  values
    (hh, 'Toey', 'admin'),
    (hh, 'Perla', 'member');

  insert into public.categories(household_id, name, kind)
  values
    (hh, 'อาหาร', 'expense'),
    (hh, 'ของใช้ในบ้าน', 'expense'),
    (hh, 'ค่าน้ำค่าไฟ', 'expense'),
    (hh, 'เดินทาง', 'expense'),
    (hh, 'รายได้', 'income'),
    (hh, 'อื่น ๆ', 'both');
end $$;

-- หลังสร้าง Admin User ใน Supabase Authentication > Users แล้ว
-- ให้นำ UUID ของ Admin มาแทนค่า ADMIN_AUTH_USER_UUID และรันคำสั่งนี้แยกต่างหาก:
--
-- insert into public.admin_users (user_id)
-- values ('ADMIN_AUTH_USER_UUID');
