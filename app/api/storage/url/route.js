import { NextResponse } from 'next/server';
import { requireAppProfile } from '@/lib/supabase/server-auth';
import { createAdminSupabase } from '@/lib/supabase/server-admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const auth = await requireAppProfile();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
    const url = new URL(request.url);
    const bucket = url.searchParams.get('bucket') || 'receipts';
    const path = url.searchParams.get('path') || '';
    if (!path) return NextResponse.json({ error: 'ไม่พบตำแหน่งไฟล์' }, { status: 400 });
    const admin = createAdminSupabase();
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300);
    if (error) throw error;
    return NextResponse.json({ url: data.signedUrl, expiresIn: 300 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'สร้างลิงก์เปิดไฟล์ไม่สำเร็จ' }, { status: 500 });
  }
}
