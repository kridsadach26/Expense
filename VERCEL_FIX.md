# Vercel TypeScript Build Fix

ไฟล์นี้ย้าย `typescript` และ `@types/*` ไปไว้ใน `dependencies`
เพื่อให้ Vercel ติดตั้งแพ็กเกจที่ต้องใช้ตอน Build เสมอ

ใน Vercel:
1. Settings → Build and Deployment
2. Install Command: ปล่อยว่าง หรือใช้ `npm install`
3. ลบ Environment Variable `NODE_ENV` ถ้ามี
4. Deployments → Redeploy → ปิด Use existing Build Cache
