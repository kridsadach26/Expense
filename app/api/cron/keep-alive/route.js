import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/server-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const KEEP_ALIVE_QUERY_COUNT = 3;

function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

function isAuthorized(request, secret) {
  if (!secret) return false;

  const actual = Buffer.from(request.headers.get('authorization') || '', 'utf8');
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request) {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const requestId = request.headers.get('x-vercel-id') || 'local';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.length < 16) {
    console.error('[keep-alive] CRON_SECRET is missing or too short', { requestId, checkedAt });
    return json({ ok: false, error: 'Keep-alive is not configured' }, 503);
  }

  if (!isAuthorized(request, cronSecret)) {
    console.warn('[keep-alive] Unauthorized request rejected', { requestId, checkedAt });
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createAdminSupabase();

    // Three tiny read-only requests provide daily database activity without changing data.
    const results = await Promise.all(
      Array.from({ length: KEEP_ALIVE_QUERY_COUNT }, () =>
        supabase.from('profiles').select('id').limit(1)
      )
    );

    const failedQuery = results.find(({ error }) => error);
    if (failedQuery?.error) throw failedQuery.error;

    const durationMs = Date.now() - startedAt;
    console.info('[keep-alive] Supabase query succeeded', {
      requestId,
      checkedAt,
      queryCount: KEEP_ALIVE_QUERY_COUNT,
      durationMs,
    });

    return json({
      ok: true,
      service: 'supabase',
      queryCount: KEEP_ALIVE_QUERY_COUNT,
      checkedAt,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('[keep-alive] Supabase query failed', {
      requestId,
      checkedAt,
      durationMs,
      code: error?.code || null,
      message: String(error?.message || 'Unknown error').slice(0, 300),
    });

    return json(
      {
        ok: false,
        error: 'Supabase keep-alive query failed',
        checkedAt,
      },
      500
    );
  }
}
