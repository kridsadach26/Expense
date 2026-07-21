import { NextResponse } from 'next/server';
import { requireAppProfile } from '@/lib/supabase/server-auth';
import { createAdminSupabase } from '@/lib/supabase/server-admin';

export const dynamic = 'force-dynamic';

async function householdContext(auth) {
  if (!auth.profile?.profile_id) throw new Error('ไม่พบโปรไฟล์ที่กำลังใช้งาน');
  const admin = createAdminSupabase();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, household_id, display_name')
    .eq('id', auth.profile.profile_id)
    .single();
  if (error || !profile) throw error || new Error('ไม่พบข้อมูลครัวเรือน');
  return { admin, profile };
}

export async function GET() {
  try {
    const auth = await requireAppProfile();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
    const { admin, profile } = await householdContext(auth);
    const { data, error } = await admin
      .from('household_app_state')
      .select('state, version, updated_at, updated_by_profile_id')
      .eq('household_id', profile.household_id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({
      exists: Boolean(data),
      state: data?.state || {},
      version: Number(data?.version || 0),
      updatedAt: data?.updated_at || null,
      activeProfile: { id: profile.id, name: profile.display_name },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'โหลดข้อมูล Cloud ไม่สำเร็จ' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAppProfile();
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
    const body = await request.json();
    const state = body?.state;
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }
    const serialized = JSON.stringify(state);
    if (Buffer.byteLength(serialized, 'utf8') > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'ข้อมูลมีขนาดใหญ่เกินไป กรุณาลบรูปแบบ Base64 หรือย้ายไฟล์แนบไป Storage' }, { status: 413 });
    }
    const { admin, profile } = await householdContext(auth);
    const { data, error } = await admin
      .from('household_app_state')
      .upsert({
        household_id: profile.household_id,
        state,
        updated_by_profile_id: profile.id,
      }, { onConflict: 'household_id' })
      .select('version, updated_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, version: Number(data.version), updatedAt: data.updated_at });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'บันทึกข้อมูล Cloud ไม่สำเร็จ' }, { status: 500 });
  }
}
