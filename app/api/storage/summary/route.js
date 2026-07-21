import { NextResponse } from 'next/server';
import { requireAppProfile } from '@/lib/supabase/server-auth';
import { createAdminSupabase } from '@/lib/supabase/server-admin';

export const dynamic = 'force-dynamic';

function quotaBytes() {
  const raw = Number(process.env.SUPABASE_STORAGE_QUOTA_BYTES || 1073741824);
  return Number.isFinite(raw) && raw > 0 ? raw : 1073741824;
}

export async function GET() {
  try {
    const auth = await requireAppProfile();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

    const admin = createAdminSupabase();
    const { data: usage, error } = await admin.rpc('app_storage_usage');
    if (error) throw error;
    const usedBytes = Number(usage?.used_bytes || 0);
    const fileCount = Number(usage?.file_count || 0);
    const byBucket = usage?.by_bucket || {};

    const quota = quotaBytes();
    return NextResponse.json({
      usedBytes,
      quotaBytes: quota,
      remainingBytes: Math.max(quota - usedBytes, 0),
      percentUsed: quota ? Math.min((usedBytes / quota) * 100, 100) : 0,
      fileCount,
      byBucket,
      calculatedAt: new Date().toISOString(),
      quotaSource: process.env.SUPABASE_STORAGE_QUOTA_BYTES ? 'environment' : 'default-1gb',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'โหลดพื้นที่ใช้งานไม่สำเร็จ' }, { status: 500 });
  }
}
