import { projectShareOverview } from '@/lib/project-share-overview.mjs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server-admin';
import { requireAppProfile } from '@/lib/supabase/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function response(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function sign(payload) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update('project-share-v1:' + payload).digest('base64url');
}

function decode(token) {
  if (!/^[\w-]{1,700}\.[\w-]{43}$/.test(token || '')) return null;
  const [payload, signature] = token.split('.');
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(sign(payload)))) return null;
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return claims.expires > Date.now() ? claims : null;
}

async function loadProject(admin, householdId, projectId) {
  const { data, error } = await admin.from('household_app_state')
    .select('state,version').eq('household_id', householdId).maybeSingle();
  if (error) throw error;
  const project = data?.state?.projects?.find(p => p.id === projectId);
  return { data, project: project?.status === 'cancelled' ? null : project };
}

export async function POST(request) {
  try {
    const admin = createAdminSupabase();
    const authorization = request.headers.get('authorization');
    const body = await request.json();
    if (authorization === null) {
      const auth = await requireAppProfile();
      if (!auth.ok || !auth.profile) return response({ error: 'กรุณาเข้าสู่ระบบ' }, 401);
      const { data: profile, error } = await admin.from('profiles')
        .select('household_id,display_name').eq('id', auth.profile.profile_id).single();
      if (error) throw error;
      const { project } = await loadProject(admin, profile.household_id, body?.projectId);
      if (!project || project.owner !== profile.display_name) {
        return response({ error: 'เฉพาะเจ้าของโปรเจกต์เท่านั้นที่สร้างลิงก์ได้' }, 403);
      }
      const payload = Buffer.from(JSON.stringify({
        householdId: profile.household_id,
        projectId: project.id,
        shareVersion: project.shareVersion || '',
        expires: Date.now() + 30 * 86400000
      })).toString('base64url');
      return response({ token: payload + '.' + sign(payload) });
    }

    const claims = decode(authorization.replace(/^Bearer /, ''));
    if (!claims) return response({ error: 'ลิงก์หมดอายุหรือไม่ถูกต้อง' }, 403);
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, project } = await loadProject(admin, claims.householdId, claims.projectId);
      if (!project || (project.shareVersion || '') !== claims.shareVersion) {
        return response({ error: 'ลิงก์นี้ถูกปิดแล้ว' }, 403);
      }
      const members = (project.members || []).filter(m => m.active !== false);
      if (body.action === 'view') {
        return response({
          name: project.name,
          currency: project.currency || 'THB',
          open: project.status === 'active',
          members: members.map(({ id, name }) => ({ id, name })),
          overview: projectShareOverview(project),
          itinerary: project.sharedItinerary || null
        });
      }

      const { action, memberId, date, id } = body;
      const note = String(body.note || '').trim().slice(0, 500);
      const amount = Number(body.amount);
      if (!members.some(m => m.id === memberId) ||
          !Number.isFinite(amount) || amount <= 0 || amount > 100000000 ||
          !/^\d{4}-\d\d-\d\d$/.test(date || '') || !/^[\da-f-]{36}$/i.test(id || '')) {
        return response({ error: 'กรุณากรอกผู้ส่ง วันที่ และยอดเงินให้ถูกต้อง' }, 400);
      }

      project.pending ||= [];
      if (project.pending.some(item => item.id === id) ||
          project.expenses?.some(item => item.guestRequestId === id) ||
          project.settlements?.some(item => item.guestRequestId === id)) {
        return response({ ok: true });
      }
      if (project.pending.length >= 100) return response({ error: 'คิวเต็ม กรุณาแจ้งเจ้าของโปรเจกต์' }, 409);
      const item = { id, date, amount, note, submitterId: memberId, createdAt: new Date().toISOString() };
      if (action === 'expense' && project.status === 'active') {
        const name = String(body.name || '').trim().slice(0, 120);
        const participantIds = [...new Set(Array.isArray(body.participantIds) ? body.participantIds : [])];
        const image = typeof body.image === 'string' ? body.image : '';
        if (!name || !participantIds.length || !participantIds.every(value => members.some(m => m.id === value)) ||
            image.length > 250000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)) {
          return response({ error: 'กรุณาระบุรายการ ผู้ร่วมหาร และแนบรูปหลักฐาน' }, 400);
        }
        Object.assign(item, { name, payerId: memberId, participantIds, images: [image] });
      } else if (action === 'payment' && body.toId !== memberId && members.some(m => m.id === body.toId)) {
        const method = ['transfer', 'cash', 'wallet', 'other'].includes(body.method) ? body.method : 'other';
        Object.assign(item, { kind: 'payment', toId: body.toId, method });
      } else {
        return response({ error: 'รายการนี้ส่งไม่ได้ กรุณาตรวจสอบสถานะโปรเจกต์และผู้รับเงิน' }, 400);
      }
      project.pending.unshift(item);
      if (Buffer.byteLength(JSON.stringify(data.state)) > 8 * 1024 * 1024) {
        return response({ error: 'พื้นที่โปรเจกต์เต็ม กรุณาแจ้งเจ้าของโปรเจกต์' }, 413);
      }
      const { data: saved, error } = await admin.from('household_app_state')
        .update({ state: data.state }).eq('household_id', claims.householdId)
        .eq('version', data.version).select('version').maybeSingle();
      if (error) throw error;
      if (saved) return response({ ok: true });
    }
    return response({ error: 'มีการแก้ไขพร้อมกัน กรุณาลองส่งอีกครั้ง' }, 409);
  } catch (error) {
    console.error('Project share request failed', error);
    return response({ error: 'ระบบแชร์โปรเจกต์ไม่พร้อม กรุณาลองอีกครั้ง' }, 500);
  }
}
