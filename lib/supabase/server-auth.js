import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createRequestSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Route handlers can read existing auth cookies even when writes are unavailable.
          }
        },
      },
    }
  );
}

export async function requireAppProfile() {
  const supabase = await createRequestSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, status: 401, message: 'กรุณาเข้าสู่ระบบใหม่' };
  }

  const { data, error } = await supabase.rpc('current_app_profile');
  if (error || !data?.length) {
    const { data: admin } = await supabase.rpc('is_current_user_admin');
    if (admin !== true) {
      return { ok: false, status: 403, message: 'ไม่มีสิทธิ์ใช้งาน' };
    }
    return { ok: true, supabase, user: authData.user, profile: null, isAdmin: true };
  }

  return { ok: true, supabase, user: authData.user, profile: data[0], isAdmin: false };
}
