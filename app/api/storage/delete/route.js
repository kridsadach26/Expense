import { NextResponse } from 'next/server';
import { requireAppProfile } from '@/lib/supabase/server-auth';
import { createAdminSupabase } from '@/lib/supabase/server-admin';

export async function POST(request) {
  try {
    const auth = await requireAppProfile();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const body = await request.json();
    const bucket = typeof body.bucket === 'string' ? body.bucket : 'receipts';
    const paths = Array.isArray(body.paths)
      ? [...new Set(body.paths.filter((path) => typeof path === 'string' && path.trim()).map((path) => path.trim()))]
      : [];

    if (!paths.length) return NextResponse.json({ error: 'ยังไม่ได้เลือกไฟล์' }, { status: 400 });
    if (paths.length > 1000) return NextResponse.json({ error: 'ลบได้ครั้งละไม่เกิน 1,000 ไฟล์' }, { status: 400 });

    const admin = createAdminSupabase();
    const { data, error } = await admin.storage.from(bucket).remove(paths);
    if (error) throw error;

    // Clean application references after the Storage API has removed the physical objects.
    await Promise.all([
      admin.from('entry_attachments').delete().in('storage_path', paths),
      admin.from('project_attachments').delete().in('storage_path', paths),
    ]);

    return NextResponse.json({ ok: true, deleted: data?.length || paths.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'ลบไฟล์ไม่สำเร็จ' }, { status: 500 });
  }
}
