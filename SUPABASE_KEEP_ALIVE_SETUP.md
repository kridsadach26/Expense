# Supabase Keep Alive — คู่มือติดตั้งและตรวจสอบ

ตรวจสอบนโยบายล่าสุดวันที่ **26 สิงหาคม 2026**

## สรุปการทำงาน

```text
Vercel Cron (03:00–03:59 UTC / 10:00–10:59 น. ประเทศไทย)
  ↓ Authorization: Bearer <CRON_SECRET>
GET /api/cron/keep-alive
  ↓ ตรวจ Secret แบบ timing-safe
Supabase REST API
  ↓ SELECT id FROM profiles LIMIT 1 × 3
JSON Success / Error
```

- Query ทั้ง 3 ครั้งเป็นแบบอ่านอย่างเดียว ไม่มี `insert`, `update`, `delete` หรือ `upsert`
- ไม่เพิ่มตาราง, Function, Trigger, Policy หรือ SQL Migration
- ใช้ตาราง `profiles` ที่มีอยู่แล้ว และไม่ส่ง ID ที่อ่านได้กลับไปใน API Response
- การเรียกซ้ำปลอดภัย เพราะ Endpoint ไม่แก้ไขข้อมูล (idempotent)

## ไฟล์ที่เพิ่ม

1. `app/api/cron/keep-alive/route.js` — API, Security, Query และ Logging
2. `vercel.json` — ตั้ง Vercel Cron วันละ 1 ครั้ง
3. `SUPABASE_KEEP_ALIVE_SETUP.md` — คู่มือนี้

## ไฟล์ที่แก้ไข

1. `.env.example` — เพิ่มตัวอย่าง `CRON_SECRET`
2. `README.md` — เพิ่มหัวข้อ Supabase Keep Alive
3. `FINAL_INSTALL.txt` — เพิ่ม Server-only Environment Variables ในรายการ Deploy

## Environment Variables

เข้า Vercel → Project → **Settings** → **Environment Variables**

| ชื่อ | สถานะ | ขอบเขต | หมายเหตุ |
| --- | --- | --- | --- |
| `CRON_SECRET` | ต้องเพิ่ม | Production | สุ่มอย่างน้อย 16 ตัวอักษร; แนะนำ 60–64 ตัวอักษร |
| `NEXT_PUBLIC_SUPABASE_URL` | มีอยู่แล้ว | Production | ไม่ต้องเปลี่ยน |
| `SUPABASE_SERVICE_ROLE_KEY` | มีใช้ฝั่ง Server อยู่แล้ว | Production | ห้ามใส่ `NEXT_PUBLIC_`; ไม่ต้องสร้างค่าใหม่ถ้ามีอยู่แล้ว |

ไม่ต้องใส่ Secret ใน `vercel.json`, URL, GitHub Source, Screenshot หรือ Chat

สร้าง Secret 64 ตัวอักษรได้ด้วย:

```bash
openssl rand -hex 32
```

## วิธี Deploy

1. เพิ่ม `CRON_SECRET` ใน Vercel Environment Variables แล้วเลือก **Production**
2. ยืนยันว่า `NEXT_PUBLIC_SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` มีค่าอยู่แล้ว
3. Push ไฟล์ขึ้น GitHub หรือ Deploy Production จาก Vercel
4. ถ้าเพิ่ม Environment Variable หลัง Deployment เดิม ให้กด **Redeploy** อีกครั้ง
5. เข้า Vercel → Project → **Cron Jobs** ควรพบ `/api/cron/keep-alive`

`0 3 * * *` ใช้เวลา UTC: Vercel Hobby อาจเรียกได้ในช่วง 03:00–03:59 UTC หรือ 10:00–10:59 น. เวลาไทย

## วิธีทดสอบ API

ตั้งค่าใน PowerShell โดยไม่พิมพ์ Secret ซ้ำในแต่ละคำสั่ง:

```powershell
$env:APP_URL = "https://YOUR-PROJECT.vercel.app"
$env:CRON_SECRET = "ค่าเดียวกับที่ตั้งใน-Vercel"
```

### 1. Secret ถูกต้อง

```powershell
curl.exe -i -H "Authorization: Bearer $env:CRON_SECRET" "$env:APP_URL/api/cron/keep-alive"
```

ควรได้ `HTTP 200` และ JSON มี `"ok":true`, `"queryCount":3`

### 2. Secret ผิด

```powershell
curl.exe -i -H "Authorization: Bearer wrong-secret" "$env:APP_URL/api/cron/keep-alive"
```

ควรได้ `HTTP 401` และ `{"ok":false,"error":"Unauthorized"}`

### 3. ไม่ส่ง Secret

```powershell
curl.exe -i "$env:APP_URL/api/cron/keep-alive"
```

ควรได้ `HTTP 401`

### 4. เรียกซ้ำ

รันคำสั่ง Secret ถูกต้อง 2 ครั้ง ควรได้ `HTTP 200` ทั้งคู่ และไม่มีข้อมูลในตารางเปลี่ยนแปลง

### 5. Supabase Query Error

ห้ามทดสอบด้วยการลบหรือแก้ไขตารางจริง วิธีที่ปลอดภัยคือทดสอบใน Preview/Staging ด้วย Service Role Key ที่ไม่ถูกต้อง แล้วกู้ค่าเดิมทันที

ผลที่คาด: `HTTP 500`, `"ok":false`, `"error":"Supabase keep-alive query failed"` และ Vercel Runtime Log มี `[keep-alive] Supabase query failed`

## วิธีตรวจว่า Cron ทำงานจริง

1. Vercel → Project → **Cron Jobs** → เลือก `/api/cron/keep-alive`
2. ตรวจ Execution ล่าสุดว่าได้ Status `200`
3. กด **View Logs** และค้น `[keep-alive] Supabase query succeeded`
4. เข้า Supabase → Project → **Logs** → **API Gateway** หรือ **Postgres Logs**
5. กรองเวลาให้ตรงกับ `checkedAt` ใน JSON/Vercel Log แล้วตรวจ `GET /rest/v1/profiles`

หมายเหตุ: Vercel ไม่ Retry งานที่ล้มเหลวอัตโนมัติ และอาจมีทั้งรอบที่พลาดหรือถูกเรียกซ้ำ Endpoint นี้จึงออกแบบให้การเรียกซ้ำไม่แก้ไขข้อมูล

## ผลทดสอบก่อนส่งมอบ

ทดสอบวันที่ 26 สิงหาคม 2026 ด้วย Next.js 16.3.3 และ Supabase REST API จำลองในเครื่อง:

| รายการ | ผลที่คาด | ผลจริง |
| --- | --- | --- |
| Production build | Build ผ่านและมี Dynamic Route | ✅ ผ่าน; พบ `ƒ /api/cron/keep-alive` |
| ไม่ส่ง Authorization | `401` | ✅ `401` |
| Secret ผิด | `401` | ✅ `401` |
| Secret ถูก + Query สำเร็จ | `200`, `queryCount: 3` | ✅ `200`, `queryCount: 3` |
| เรียกซ้ำ | ทั้งสองครั้งได้ `200` | ✅ `200` ทั้งสองครั้ง |
| Supabase Query Error จำลอง | `500` และ Error Log | ✅ `500`; ไม่มี Secret ใน Log/Response |

การตรวจ **Supabase Logs จริง** และ **Vercel Cron Execution จริง** จะทำได้หลัง Deploy เท่านั้น เพราะไม่มี Production URL และ Secret จริงในชุดไฟล์ ให้ตรวจตามขั้นตอนด้านบนหลังขึ้น Production

## การแก้ปัญหา

| อาการ | สาเหตุที่พบบ่อย | วิธีแก้ |
| --- | --- | --- |
| Deploy ไม่ผ่านเรื่อง Cron | Plan ไม่รองรับความถี่ | ตรวจว่า Schedule ยังเป็น `0 3 * * *`; Hobby รองรับได้สูงสุดวันละครั้ง |
| `401 Unauthorized` จาก Cron | `CRON_SECRET` ไม่ตรง/ไม่อยู่ใน Production | แก้ค่า Vercel Environment และ Redeploy |
| `503 Keep-alive is not configured` | ไม่มี `CRON_SECRET` ใน Runtime หรือยาวน้อยกว่า 16 ตัวอักษร | เพิ่มค่ายาวอย่างน้อย 16 ตัวอักษรใน Vercel Production แล้ว Redeploy |
| `500 Supabase keep-alive query failed` | URL/Service Role ผิด, Project Paused, หรือ Supabase ขัดข้อง | ดู Error Code ใน Vercel Log, ตรวจ Environment, Supabase Status และ Resume Project |
| ไม่มี Execution/Log | ดู Preview แทน Production, Cron ยังไม่ถูก Deploy, หรือรอบส่งพลาด | ตรวจ Production Deployment/Cron Jobs, เรียก API เอง, รอรอบถัดไป |
| เวลารันไม่ตรง 10:00 น. | Hobby มีความแม่นยำรายชั่วโมง | ถือว่าปกติหากรันภายใน 10:00–10:59 น. |

## ทางเลือกสำรองเมื่อ Vercel Cron ใช้ไม่ได้

ใช้ GitHub Actions แล้วตั้ Repository Secrets:

- `KEEP_ALIVE_URL` = `https://YOUR-PROJECT.vercel.app/api/cron/keep-alive`
- `CRON_SECRET` = ค่าเดียวกับ Vercel

ตัวอย่า Workflow วันละครั้ง:

```yaml
name: Supabase Keep Alive

on:
  schedule:
    - cron: "30 3 * * *"
  workflow_dispatch:

jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Call protected endpoint
        run: |
          curl --fail-with-body --silent --show-error \
            --retry 2 --retry-all-errors \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.KEEP_ALIVE_URL }}"
```

อย่าเปิด Vercel Cron และ GitHub Actions พร้อมกันโดยไม่จำเป็น เพราะจะเพิ่ม Execution และ Log โดยไม่เพิ่มความจำเป็นด้านธุรกิจ

## ค่าใช้จ่ายและข้อจำกัด

- วิธีที่เลือก: **0 บาท/เดือน** ภายใต้ Supabase Free + Vercel Hobby ตราบใดที่ Usage รวมยังไม่เกิน Quota ของแต่ละบริการ
- Vercel Hobby: Cron ได้สูงสุดวันละครั้ง และเวลาอาจคลาดเคลื่อนได้ถึง 59 นาที
- Vercel Cron ไม่ Retry อัตโนมัติ, เป็น best-effort และอาจเรียกซ้ำได้บางครั้ง
- Supabase Free: พิจารณาการใช้งานฐานข้อมูลย้อนหลัง 7 วัน; เอกสารระบุว่าโดยทั่วไป Query/API requests เล็กน้อยหลายครั้งต่อวันในสัปดาห์มักเพียงพอ
- Supabase ไม่เปิดเผย Threshold ที่รับประกัน ดังนั้นจึงไม่สามารถรับรอง 100% ว่า Keep Alive จะป้องกัน Pause ได้ทุกกรณี
- เอกสารทางการยืนยันว่า API calls จาก Connected Application สร้าง Activity ได้ และ AUP ปัจจุบันไม่มีข้อห้าม Keep Alive ขนาดเล็กโดยตรง; แต่ห้ามใช้งานที่รบกวน/ทำให้บริการเสื่อมคุณภาพ
- วิธีเดียวที่ป้องกัน Automatic Pause ได้แบบรับประกันตามเอกสารคือย้าย Project ไป Paid Plan

## เอกสารทางการที่ตรวจสอบ

- Supabase Project Pausing: <https://supabase.com/docs/guides/platform/free-project-pausing>
- Supabase Acceptable Use Policy: <https://supabase.com/aup>
- Vercel Cron Usage & Pricing: <https://vercel.com/docs/cron-jobs/usage-and-pricing>
- Vercel Managing Cron Jobs: <https://vercel.com/docs/cron-jobs/manage-cron-jobs>
- Vercel Cron Quickstart: <https://vercel.com/docs/cron-jobs/quickstart>
- GitHub Actions Billing (fallback): <https://docs.github.com/en/billing/concepts/product-billing/github-actions>

## การยืนยันผลกระทบระบบเดิม

การเปลี่ยนแปลงนี้แยกอยู่ใน API Route ใหม่และ Vercel Cron Config ไม่แก้ Authentication, Frontend, Business Logic, Storage, Database Schema, RLS Policy หรือข้อมูลเดิม และไม่เปลี่ยนค่า Environment Variable ที่มีอยู่
