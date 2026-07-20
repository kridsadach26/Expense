"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function AdminPage() {
  const [profiles, setProfiles] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load().catch((error) => {
      console.error(error);
      setMessage("ไม่สามารถเปิดหน้า Admin ได้");
      setLoading(false);
    });
  }, []);

  async function load() {
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_current_user_admin");
    if (adminError || isAdmin !== true) {
      window.location.href = "/";
      return;
    }

    const { data, error } = await supabase.rpc("admin_list_profiles");
    if (error) throw error;
    setProfiles(data ?? []);
    setLoading(false);
  }

  async function resetPin(profileId, displayName) {
    if (!confirm(`รีเซ็ต PIN ของ ${displayName} หรือไม่?`)) return;

    const { data, error } = await supabase.rpc("admin_reset_profile_pin", {
      p_profile_id: profileId,
    });

    if (error || !data?.ok) {
      setMessage(error?.message ?? data?.message ?? "รีเซ็ต PIN ไม่สำเร็จ");
      return;
    }

    setProfiles((items) =>
      items.map((item) =>
        item.id === profileId ? { ...item, pin_is_set: false } : item
      )
    );
    setMessage(`รีเซ็ต PIN ของ ${displayName} แล้ว`);
  }

  async function toggleProfile(profileId, displayName, active) {
    const action = active ? "ปิดใช้งาน" : "เปิดใช้งาน";
    if (!confirm(`${action} ${displayName} หรือไม่?`)) return;

    const { data, error } = await supabase.rpc("admin_set_profile_active", {
      p_profile_id: profileId,
      p_active: !active,
    });

    if (error || !data?.ok) {
      setMessage(error?.message ?? data?.message ?? `${action}ไม่สำเร็จ`);
      return;
    }

    setProfiles((items) =>
      items.map((item) =>
        item.id === profileId ? { ...item, active: !active } : item
      )
    );
    setMessage(`${action} ${displayName} แล้ว`);
  }

  async function logoutAdmin() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return <main className="center"><div className="card">กำลังเปิดหน้า Admin…</div></main>;
  }

  return (
    <main className="appShell">
      <header className="topbar">
        <button className="homeMark" onClick={() => window.location.href = "/"}>⌂</button>
        <div>
          <strong>Admin</strong>
          <small>จัดการผู้ใช้งานและ PIN</small>
        </div>
        <button className="ghost" onClick={logoutAdmin}>ออก</button>
      </header>

      <section className="content">
        <h1>จัดการผู้ใช้งาน</h1>

        {message && <p className="message">{message}</p>}

        <div className="adminList">
          {profiles.map((profile) => (
            <article className="card adminUserCard" key={profile.id}>
              <div className="avatar small">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" />
                  : profile.display_name.slice(0, 1).toUpperCase()}
              </div>

              <div className="adminUserInfo">
                <strong>{profile.display_name}</strong>
                <small>
                  {profile.role === "admin" ? "ผู้ดูแล" : "สมาชิก"} ·
                  {profile.pin_is_set ? " มี PIN แล้ว" : " ยังไม่ได้ตั้ง PIN"} ·
                  {profile.active ? " ใช้งานอยู่" : " ปิดใช้งาน"}
                </small>
              </div>

              <div className="adminActions">
                <button
                  className="secondary"
                  onClick={() => resetPin(profile.id, profile.display_name)}
                >
                  รีเซ็ต PIN
                </button>
                <button
                  className={profile.active ? "danger" : "primary"}
                  onClick={() => toggleProfile(profile.id, profile.display_name, profile.active)}
                >
                  {profile.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
