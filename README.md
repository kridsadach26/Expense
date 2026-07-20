# บ้านเรา — Home Expense Cloud

ระบบเริ่มต้นสำหรับ GitHub, Vercel และ Supabase พร้อมติดตั้งบนมือถือแบบ PWA

## ระบบเข้าสู่ระบบ

### สมาชิกทั่วไป

- เลือกชื่อ เช่น Toey หรือ Perla
- ครั้งแรกตั้ง PIN ตัวเลข 6 หลัก
- ครั้งต่อไปเข้าใช้งานด้วย PIN
- ใส่ PIN ผิดครบ 5 ครั้ง ระบบล็อกชั่วคราว 5 นาที
- เปลี่ยน PIN ได้จากหน้าตั้งค่า

### Admin

- กดรูปบ้านเล็กบริเวณมุมซ้ายบนของหน้า Login
- เข้าสู่ระบบด้วยอีเมลและรหัสผ่านของ Supabase Auth
- ระบบตรวจสิทธิ์จากตาราง `admin_users`
- Admin รีเซ็ต PIN และเปิด/ปิดผู้ใช้ได้

รูปบ้านเป็นเพียงปุ่มเปิดหน้า Admin Login ไม่ใช่ช่องทางข้ามรหัสผ่าน

## 1. สร้าง Supabase Project

1. สร้าง Supabase Project ใหม่
2. เปิด `Authentication → Providers`
3. เปิดใช้งาน **Email**
4. เปิดใช้งาน **Anonymous Sign-ins**
5. เข้า `SQL Editor`
6. รัน `supabase/migrations/001_initial.sql`
7. รัน `supabase/seed.sql`

## 2. สร้าง Admin User

ไปที่:

`Authentication → Users → Add user`

สร้างผู้ใช้ด้วยอีเมลและรหัสผ่าน เช่น:

```text
admin@yourdomain.com
```

จากนั้นคัดลอก UUID ของผู้ใช้ Admin แล้วรันใน SQL Editor:

```sql
insert into public.admin_users (user_id)
values ('UUID-ของ-ADMIN');
```

Admin Login จะใช้งานได้หลังเพิ่ม UUID ลงในตารางนี้แล้ว

## 3. ตั้งค่า Environment

คัดลอก `.env.example` เป็น `.env.local`

```bash
cp .env.example .env.local
```

ใส่ค่า:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

ใช้เฉพาะ **Anon Key** ในหน้าเว็บ ห้ามนำ Service Role Key ใส่ใน Environment ที่ขึ้นต้นด้วย `NEXT_PUBLIC_`

## 4. ทดสอบในเครื่อง

```bash
npm install
npm run dev
```

เปิด:

```text
http://localhost:3000
```

## 5. อัปโหลด GitHub

1. สร้าง Repository ใหม่
2. แตกไฟล์ ZIP
3. อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดที่อยู่ภายในโฟลเดอร์โปรเจกต์
4. ตรวจให้ `package.json` อยู่ที่หน้าแรกของ Repository

หรือใช้ Git:

```bash
git init
git add .
git commit -m "Initial Home Expense Cloud"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## 6. Deploy Vercel

1. เข้า Vercel
2. Import Git Repository
3. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. กด Deploy

## 7. ติดตั้งเป็นแอปบนมือถือ

### iPhone / iPad

Safari → Share → Add to Home Screen

### Android

Chrome → เมนู → Install app หรือ Add to Home screen

## โครงสร้างฐานข้อมูลที่เตรียมไว้

- Household
- Profiles และ PIN
- Admin Users
- Device Sessions
- รายรับรายจ่าย
- บิลแชร์
- รูปบิล
- โปรเจกต์
- สมาชิกโปรเจกต์
- ค่าใช้จ่ายหลายสกุลเงิน
- รายการรออนุมัติ
- Supabase Storage bucket ชื่อ `receipts`

## สถานะ

เวอร์ชันนี้มี Cloud Foundation ได้แก่:

- Member PIN Login
- Admin Supabase Login
- Admin Reset PIN
- Admin Enable/Disable Profile
- PWA
- Database Schema
- Storage Schema

หน้ารายรับรายจ่ายและโปรเจกต์เต็มรูปแบบจะย้ายจาก HTML Prototype เข้ามาในขั้นพัฒนาถัดไป


## Vercel Build

แพ็กเกจนี้ใช้ JavaScript/JSX และไม่ต้องติดตั้ง TypeScript
