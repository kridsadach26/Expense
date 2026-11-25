import { allocateCollection, collectionStatus } from '@/public/assets/trip-collections.mjs';
import { itineraryBucket, itineraryFileType, itineraryObjectIsValid, itineraryPrefix, maxItineraryBytes } from '@/lib/project-itinerary.mjs';
import { expenseProofImages, projectShareOverview } from '@/lib/project-share-overview.mjs';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
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

const tokenHash = token => createHash('sha256').update(token).digest('hex');

async function readClaims(admin, token) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) return decode(token);
  const { data, error } = await admin.from('project_share_links')
    .select('household_id,project_id,share_version,expires_at')
    .eq('token_hash', tokenHash(token)).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data && { householdId: data.household_id, projectId: data.project_id, shareVersion: data.share_version };
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
      if (body.action === 'collection-proof') {
        const pending = (project.pending || []).find(item => item.kind === 'collection' && item.id === body.requestId);
        const approved = (project.travelPlan?.fundContributions || []).find(item => item.collectionRequestId === body.requestId);
        const path = (pending || approved)?.proofPath;
        if (!itineraryObjectIsValid(path, profile.household_id, project.id)) return response({ error: 'ไม่พบสลิปกองกลาง' }, 404);
        const { data: file, error } = await admin.storage.from(itineraryBucket).createSignedUrl(path, 60);
        if (error) throw error;
        return response({ url: file.signedUrl });
      }
      if (body.action === 'payment-proof-link') {
        const item = (project.pending || []).find(entry => entry.kind === 'payment' && entry.id === body.requestId);
        if (!item || !expenseProofImages(item).length) return response({ error: 'ไม่พบสลิปของรายการรอตรวจนี้' }, 404);
        const payload = Buffer.from(JSON.stringify({
          householdId: profile.household_id, projectId: project.id, shareVersion: project.shareVersion || '',
          proofId: item.id, expires: Date.now() + 86400000
        })).toString('base64url');
        return response({ token: payload + '.' + sign(payload) });
      }
      if (body.action === 'upload-itinerary') {
        const name = String(body.name || '').replace(/[\/\\\u0000-\u001f]/g, '_').trim();
        const type = itineraryFileType(name);
        if (!type || name.length > 180 || !Number.isInteger(body.size) || body.size < 1 || body.size > maxItineraryBytes) {
          return response({ error: 'กรุณาเลือกไฟล์ที่รองรับ ขนาดไม่เกิน 25 MB' }, 400);
        }
        const path = itineraryPrefix(profile.household_id, project.id) + randomUUID() + name.slice(name.lastIndexOf('.')).toLowerCase();
        const { data, error: uploadError } = await admin.storage.from(itineraryBucket).createSignedUploadUrl(path);
        if (uploadError) throw uploadError;
        return response({ uploadUrl: data.signedUrl, file: { name, path, type } });
      }
      const token = randomBytes(16).toString('base64url');
      const { error: linkError } = await admin.from('project_share_links').insert({
        token_hash: tokenHash(token),
        household_id: profile.household_id,
        project_id: project.id,
        share_version: project.shareVersion || '',
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
      });
      if (linkError) throw linkError;
      return response({ token, short: true });
    }

    const claims = await readClaims(admin, authorization.replace(/^Bearer /, ''));
    if (!claims) return response({ error: 'ลิงก์หมดอายุหรือไม่ถูกต้อง' }, 403);
    let collectionProofPath;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, project } = await loadProject(admin, claims.householdId, claims.projectId);
      if (!project || (project.shareVersion || '') !== claims.shareVersion) {
        return response({ error: 'ลิงก์นี้ถูกปิดแล้ว' }, 403);
      }
      if (claims.proofId || body.action === 'payment-proof-view') {
        if (!claims.proofId || body.action !== 'payment-proof-view') return response({ error: 'ลิงก์นี้ใช้ดูสลิปเท่านั้น' }, 403);
        const item = (project.pending || []).find(entry => entry.kind === 'payment' && entry.id === claims.proofId);
        const image = item && expenseProofImages(item)[0];
        if (!image) return response({ error: 'รายการนี้ตรวจสอบเสร็จแล้ว หรือไม่พบสลิป' }, 404);
        const name = id => (project.members || []).find(member => member.id === id)?.name || '—';
        return response({ image, from: name(item.submitterId), to: name(item.toId), date: item.date, amount: item.amount, currency: project.currency || 'THB' });
      }
      const members = (project.members || []).filter(m => m.active !== false);
      const attachment = project.sharedItinerary;
      const stored = itineraryObjectIsValid(attachment?.path, claims.householdId, project.id);
      if (body.action === 'expense-proof') {
        const expense = (project.expenses || []).find(item => item.id && item.id === body.expenseId);
        if (!expense) return response({ error: 'ไม่พบรายการค่าใช้จ่าย' }, 404);
        const index = body.index;
        const image = Number.isInteger(index) && index >= 0 ? expenseProofImages(expense)[index] : null;
        if (!image) return response({ error: 'ไม่พบรูปหลักฐาน' }, 404);
        return response({ image });
      }
      if (body.action === 'itinerary-file') {
        if (!stored) return response({ error: 'ไม่พบไฟล์กำหนดการ' }, 404);
        const { data: file, error } = await admin.storage.from(itineraryBucket)
          .createSignedUrl(attachment.path, 120, { download: attachment.name || true });
        if (error) throw error;
        return response({ url: file.signedUrl });
      }
      if (body.action === 'view') {
        return response({
          name: project.name,
          currency: project.currency || 'THB',
          open: project.status === 'active',
          members: members.map(({ id, name }) => ({ id, name })),
          paymentPairs: project.paymentPairs || [],
          overview: projectShareOverview(project),
          collections: (project.fundCollections || []).map(round => ({
            id: round.id, name: round.name, dueDate: round.dueDate, closed: Boolean(round.closed || project.status !== 'active'),
            account: round.closed || project.status !== 'active' ? null : round.account,
            qr: round.closed || project.status !== 'active' ? null : expenseProofImages({ images: [round.qr] })[0],
            targets: collectionStatus(project, round)
          })),
          itinerary: stored
            ? { name: attachment.name, type: itineraryFileType(attachment.path), stored: true }
            : attachment?.html ? { name: attachment.name, html: attachment.html } : null
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
          project.settlements?.some(item => item.guestRequestId === id) ||
          project.travelPlan?.fundContributions?.some(item => item.collectionRequestId === id)) {
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
      } else if (action === 'collection' && project.status === 'active') {
        const round = (project.fundCollections || []).find(entry => entry.id === body.collectionId && !entry.closed);
        const cents = Math.round(amount * 100);
        const allocations = round && allocateCollection(project, round, memberId, body.together === true, cents);
        const slip = typeof body.image === 'string' ? body.image : '';
        if (!allocations) return response({ error: 'ยอดเกินยอดที่ยังส่งได้ หรือรอบนี้ปิดแล้ว กรุณาโหลดข้อมูลล่าสุด' }, 409);
        if (slip.length > 250000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(slip)) {
          return response({ error: 'กรุณาแนบรูปสลิปกองกลาง' }, 400);
        }
        if (!collectionProofPath) {
          const path = itineraryPrefix(claims.householdId, project.id) + randomUUID() + '.jpg';
          const bytes = Buffer.from(slip.split(',')[1], 'base64');
          if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) return response({ error: 'รูปสลิปไม่ถูกต้อง' }, 400);
          const { error } = await admin.storage.from(itineraryBucket).upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
          if (error) throw error;
          collectionProofPath = path;
        }
        Object.assign(item, { kind: 'collection', collectionId: round.id, allocations, proofPath: collectionProofPath });
      } else if (action === 'payment' &&
                 !(project.paymentPairs || []).some(pair => pair.includes(memberId) && pair.includes(body.toId)) && body.toId !== memberId && members.some(m => m.id === body.toId)) {
        const method = ['transfer', 'cash', 'wallet', 'other'].includes(body.method) ? body.method : 'other';
        const image = typeof body.image === 'string' ? body.image : '';
        if (image.length > 250000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) {
          return response({ error: 'กรุณาแนบรูปสลิปหรือหลักฐานการชำระเงิน' }, 400);
        }
        Object.assign(item, { kind: 'payment', toId: body.toId, method, images: [image] });
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
