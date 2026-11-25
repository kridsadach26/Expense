import { isDeepStrictEqual } from 'node:util';
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
    if (!Number.isSafeInteger(body.version) || body.version < 0) {
      return NextResponse.json({ error: 'กรุณาโหลดข้อมูล Cloud ล่าสุดก่อนบันทึก' }, { status: 409 });
    }
    if (body.version > 0) {
      const { data: current, error: readError } = await admin.from('household_app_state')
        .select('state,version').eq('household_id', profile.household_id).maybeSingle();
      if (readError) throw readError;
      if (Number(current?.version) !== body.version) {
        return NextResponse.json({ error: 'Cloud มีข้อมูลใหม่ กรุณาสำรองรายการที่ยังไม่ได้บันทึกและโหลดใหม่' }, { status: 409 });
      }
      const incoming = new Map((Array.isArray(state.projects) ? state.projects : []).map(project => [project?.id, project]));
      for (const project of current.state?.projects || []) {
        if (project.owner === profile.display_name) continue;
        const next = incoming.get(project.id);
        const protectedFields = item => ({
          pending: item?.pending || [],
          collections: item?.fundCollections || [],
          confirmedCollections: (item?.travelPlan?.fundContributions || []).filter(row => row.collectionRequestId),
          itinerary: item?.sharedItinerary || null,
          shareVersion: item?.shareVersion || '',
          guestExpenses: (item?.expenses || []).filter(row => row.guestRequestId),
          guestSettlements: (item?.settlements || []).filter(row => row.guestRequestId)
        });
        if ((next && next.owner !== project.owner) ||
            !isDeepStrictEqual(protectedFields(project), protectedFields(next))) {
          return NextResponse.json({ error: 'เฉพาะเจ้าของโปรเจกต์เท่านั้นที่ตรวจรายการหรือจัดการลิงก์ได้' }, { status: 403 });
        }
      }
    }
    const table = admin.from('household_app_state');
    const changes = { state, updated_by_profile_id: profile.id };
    const operation = body.version === 0
      ? table.insert({ ...changes, household_id: profile.household_id })
      : table.update(changes).eq('household_id', profile.household_id).eq('version', body.version);
    const { data, error } = await operation.select('version, updated_at').maybeSingle();
    if (error?.code === '23505' || (!error && !data)) {
      return NextResponse.json({ error: 'Cloud มีข้อมูลใหม่ กรุณาสำรองรายการที่ยังไม่ได้บันทึกและโหลดใหม่' }, { status: 409 });
    }
    if (error) throw error;
    return NextResponse.json({ ok: true, version: Number(data.version), updatedAt: data.updated_at });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'บันทึกข้อมูล Cloud ไม่สำเร็จ' }, { status: 500 });
  }
}
