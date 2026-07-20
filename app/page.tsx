"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, SessionProfile } from "@/lib/types";

const supabase = createClient();

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [sessionProfile, setSessionProfile] = useState<SessionProfile | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const title = useMemo(() => {
    if (sessionProfile) return `สวัสดี ${sessionProfile.display_name}`;
    if (selected) return selected.pin_is_set ? `ใส่ PIN ของ ${selected.display_name}` : `ตั้ง PIN ครั้งแรกให้ ${selected.display_name}`;
    return "เลือกผู้ใช้งาน";
  }, [selected, sessionProfile]);

  useEffect(() => {
    bootstrap().catch((error) => {
      console.error(error);
      setMessage("เริ่มระบบไม่สำเร็จ กรุณาตรวจสอบ Supabase");
      setLoading(false);
    });
  }, []);

  async function bootstrap() {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    }

    const { data: current } = await supabase.rpc("current_app_profile");
    if (current?.length) {
      setSessionProfile(current[0]);
    }

    const { data, error } = await supabase.rpc("list_login_profiles");
    if (error) throw error;
    setProfiles(data ?? []);
    setLoading(false);
  }

  async function submitPin() {
    if (!selected) return;
    setMessage("");

    if (!selected.pin_is_set && pin !== confirmPin) {
      setMessage("PIN ทั้งสองช่องไม่ตรงกัน");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setMessage("PIN ต้องเป็นตัวเลข 6 หลัก");
      return;
    }

    const fn = selected.pin_is_set ? "login_with_profile_pin" : "set_initial_profile_pin";
    const args = selected.pin_is_set
      ? { p_profile_id: selected.id, p_pin: pin }
      : { p_profile_id: selected.id, p_pin: pin };

    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (!data?.ok) {
      setMessage(data?.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    setSessionProfile({
      profile_id: selected.id,
      display_name: selected.display_name,
      role: selected.role,
    });
    setSelected(null);
    setPin("");
    setConfirmPin("");
  }

  async function logout() {
    await supabase.rpc("logout_app_profile");
    setSessionProfile(null);
    setSelected(null);
    setPin("");
  }

  async function adminLogin() {
    setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (error || !data.user) {
      setMessage(error?.message ?? "เข้าสู่ระบบ Admin ไม่สำเร็จ");
      return;
    }

    const { data: roleData, error: roleError } = await supabase.rpc("is_current_user_admin");
    if (roleError || roleData !== true) {
      await supabase.auth.signOut();
      setMessage("บัญชีนี้ไม่มีสิทธิ์ Admin");
      return;
    }

    window.location.href = "/admin";
  }

  if (loading) {
    return <main className="center"><div className="card">กำลังเปิดระบบ…</div></main>;
  }

  if (sessionProfile) {
    return (
      <main className="appShell">
        <header className="topbar">
          <button className="homeMark" aria-label="หน้าหลัก">⌂</button>
          <div>
            <strong>บ้านเรา</strong>
            <small>{sessionProfile.display_name}</small>
          </div>
          <button className="ghost" onClick={logout}>ออก</button>
        </header>

        <section className="content">
          <h1>{title}</h1>
          <div className="metrics">
            <article className="metric"><span>รายรับเดือนนี้</span><strong>฿0</strong></article>
            <article className="metric"><span>รายจ่ายเดือนนี้</span><strong>฿0</strong></article>
            <article className="metric"><span>ยอดค้าง</span><strong>฿0</strong></article>
          </div>

          <div className="card">
            <h2>ฐานระบบ Cloud พร้อมแล้ว</h2>
            <p>เข้าสู่ระบบด้วย PIN, รองรับ PWA, Supabase และโครงสร้างฐานข้อมูลสำหรับรายการบ้านกับโปรเจกต์</p>
            <div className="actions">
              <a className="primary" href="/settings">เปลี่ยน PIN</a>
              <button className="secondary" disabled>เพิ่มรายการ — ขั้นถัดไป</button>
              <button className="secondary" disabled>โปรเจกต์ — ขั้นถัดไป</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="center">
      <section className="loginCard">
        <button
          className="houseSecret"
          aria-label="Admin recovery"
          onClick={() => setAdminMode((value) => !value)}
        >
          ⌂
        </button>
        <div className="logo">⌂</div>
        <h1>{title}</h1>

        {!selected ? (
          <div className="profileGrid">
            {profiles.map((profile) => (
              <button className="profile" key={profile.id} onClick={() => setSelected(profile)}>
                <div className="avatar">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile.display_name.slice(0, 1).toUpperCase()}
                </div>
                <strong>{profile.display_name}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="pinPanel">
            <button className="back" onClick={() => { setSelected(null); setMessage(""); }}>← เปลี่ยนผู้ใช้</button>
            <label>PIN 6 หลัก</label>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              type="password"
              autoComplete="current-password"
            />
            {!selected.pin_is_set && (
              <>
                <label>ยืนยัน PIN</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
                  type="password"
                  autoComplete="new-password"
                />
              </>
            )}
            <button className="primary" onClick={submitPin}>
              {selected.pin_is_set ? "เข้าสู่ระบบ" : "บันทึก PIN"}
            </button>
          </div>
        )}

        {adminMode && (
          <div className="adminRecovery">
            <strong>Admin Login</strong>
            <p>เข้าสู่ระบบด้วยบัญชี Admin ที่สร้างไว้ใน Supabase Auth</p>
            <input
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
            />
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="รหัสผ่าน"
              autoComplete="current-password"
            />
            <button className="danger" onClick={adminLogin}>เข้าสู่ระบบ Admin</button>
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}
