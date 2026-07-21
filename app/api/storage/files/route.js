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
    const olderThanDays = Math.max(Number(url.searchParams.get('olderThanDays') || 0), 0);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 200), 1), 1000);
    const cutoff = olderThanDays ? new Date(Date.now() - olderThanDays * 86400000) : null;

    const admin = createAdminSupabase();
    const { data, error } = await admin.rpc('app_storage_files', {
      p_bucket: bucket,
      p_older_than: cutoff ? cutoff.toISOString() : null,
      p_limit: limit,
    });
    if (error) throw error;

    const files = (data || []).map((file) => ({
      id: file.id,
      bucket: file.bucket,
      path: file.path,
      size: Number(file.size_bytes || 0),
      mimetype: file.mimetype || '',
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));

    return NextResponse.json({ files, totalBytes: files.reduce((sum, file) => sum + file.size, 0) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'โหลดไฟล์ไม่สำเร็จ' }, { status: 500 });
  }
}
