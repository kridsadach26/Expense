"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const keypadValues = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

function PinDots({ value }) {
  return (
    <div className="pinDots" aria-label={`กรอกแล้ว ${value.length} หลัก`}>
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} className={`pinDot ${index < value.length ? "filled" : ""}`} />
      ))}
    </div>
  );
}

function PinKeypad({ onDigit, onDelete }) {
  return (
    <div className="pinKeypad">
      {keypadValues.map((key, index) => {
        if (!key) return <div key={index} className="pinKeypadSpacer" />;
        if (key === "⌫") {
          return (
            <button key={index} type="button" className="pinKey ghostKey" onClick={onDelete}>
              {key}
            </button>
          );
        }
        return (
          <button key={index} type="button" className="pinKey" onClick={() => onDigit(key)}>
            {key}
          </button>
        );
      })}
    </div>
  );
}

function OrbitMark({ small = false }) {
  return (
    <div className={`orbitMark ${small ? "small" : ""}`} aria-hidden="true">
      <span className="orbitRing outer" />
      <span className="orbitRing inner" />
      <span className="orbitDot" />
    </div>
  );
}

export default function HomePage() {
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sessionProfile, setSessionProfile] = useState(null);
  const [pin, setPin] = useState("");
  const [tempPin, setTempPin] = useState("");
  const [pinStage, setPinStage] = useState("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [submittingPin, setSubmittingPin] = useState(false);

  const title = useMemo(() => {
    if (sessionProfile) return `Welcome back, ${sessionProfile.display_name}`;
    if (!selected) return "เลือกผู้ใช้งาน";
    if (selected.pin_is_set) return `ปลดล็อค ${selected.display_name}`;
    return pinStage === "create" ? `ตั้ง PIN ให้ ${selected.display_name}` : `ยืนยัน PIN ของ ${selected.display_name}`;
  }, [selected, sessionProfile, pinStage]);

  const pinHint = useMemo(() => {
    if (!selected) return "เลือกโปรไฟล์เพื่อเข้าสู่ Expense Orbit";
    if (selected.pin_is_set) return "กรอก PIN 6 หลักเหมือนการปลดล็อคมือถือ";
    return pinStage === "create" ? "ตั้ง PIN 6 หลักสำหรับเข้าใช้งานครั้งถัดไป" : "กรอก PIN เดิมอีกครั้งเพื่อยืนยัน";
  }, [selected, pinStage]);

  useEffect(() => {
    bootstrap().catch((error) => {
      console.error(error);
      setMessage("เริ่มระบบไม่สำเร็จ กรุณาตรวจสอบ Supabase");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) {
      setPin("");
      setTempPin("");
      setPinStage("login");
      return;
    }
    setPin("");
    setTempPin("");
    setPinStage(selected.pin_is_set ? "login" : "create");
  }, [selected]);

  useEffect(() => {
    if (!selected || pin.length !== 6 || submittingPin) return;

    const timer = window.setTimeout(() => {
      if (selected.pin_is_set) {
        submitPinValue(pin);
      } else if (pinStage === "create") {
        setTempPin(pin);
        setPin("");
        setPinStage("confirm");
      } else if (pin !== tempPin) {
        setMessage("PIN ทั้งสองครั้งไม่ตรงกัน กรุณาตั้งใหม่อีกครั้ง");
        setPin("");
        setTempPin("");
        setPinStage("create");
      } else {
        submitPinValue(pin);
      }
    }, 160);

    return () => window.clearTimeout(timer);
  }, [pin, selected, pinStage, tempPin, submittingPin]);

  async function bootstrap() {
    const logoutRequested = new URLSearchParams(window.location.search).get("logout") === "1";
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    }

    if (logoutRequested) {
      await supabase.rpc("logout_app_profile");
      window.history.replaceState({}, "", "/");
    }

    const { data: current } = await supabase.rpc("current_app_profile");
    if (current?.length) {
      window.location.href = `/app.html?user=${encodeURIComponent(current[0].display_name)}`;
      return;
    }

    const { data, error } = await supabase.rpc("list_login_profiles");
    if (error) throw error;
    setProfiles(data ?? []);
    setLoading(false);
  }

  async function submitPinValue(value) {
    if (!selected) return;
    setSubmittingPin(true);
    setMessage("");

    const fn = selected.pin_is_set ? "login_with_profile_pin" : "set_initial_profile_pin";
    const { data, error } = await supabase.rpc(fn, { p_profile_id: selected.id, p_pin: value });

    if (error) {
      setSubmittingPin(false);
      setMessage(error.message);
      return;
    }
    if (!data?.ok) {
      setSubmittingPin(false);
      setMessage(data?.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      setPin("");
      return;
    }

    setSessionProfile({
      profile_id: selected.id,
      display_name: selected.display_name,
      role: selected.role,
    });
    setSubmittingPin(false);
    window.location.href = `/app.html?user=${encodeURIComponent(selected.display_name)}`;
  }

  async function handlePinContinue() {
    if (!selected || submittingPin) return;
    setMessage("");

    if (!/^\d{6}$/.test(pin)) {
      setMessage("PIN ต้องเป็นตัวเลข 6 หลัก");
      return;
    }

    if (selected.pin_is_set) {
      await submitPinValue(pin);
      return;
    }

    if (pinStage === "create") {
      setTempPin(pin);
      setPin("");
      setPinStage("confirm");
      return;
    }

    if (pin !== tempPin) {
      setMessage("PIN ทั้งสองครั้งไม่ตรงกัน กรุณาตั้งใหม่อีกครั้ง");
      setPin("");
      setTempPin("");
      setPinStage("create");
      return;
    }

    await submitPinValue(pin);
  }

  function addDigit(value) {
    if (pin.length >= 6 || submittingPin) return;
    setPin((prev) => prev + value);
  }

  function removeDigit() {
    if (submittingPin) return;
    setPin((prev) => prev.slice(0, -1));
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
    return <main className="center"><div className="card softCard">Opening Expense Orbit…</div></main>;
  }

  if (sessionProfile) {
    return (
      <main className="appShell appBackdrop orbitTheme">
        <header className="topbar glassBar">
          <div className="brandHeader">
            <OrbitMark small />
            <div>
              <strong>Expense Orbit</strong>
              <small>{sessionProfile.display_name}</small>
            </div>
          </div>
          <button className="ghost" onClick={logout}>ออก</button>
        </header>

        <section className="content">
          <div className="heroCard">
            <div>
              <p className="eyebrow">SMART HOUSEHOLD FINANCE</p>
              <h1>{title}</h1>
              <p className="heroSub">One elegant place for household expenses, shared bills, and travel projects.</p>
            </div>
            <div className="heroBadge">Orbit Ready</div>
          </div>

          <div className="metrics">
            <article className="metric modernMetric"><span>This month income</span><strong>฿0</strong></article>
            <article className="metric modernMetric"><span>This month expense</span><strong>฿0</strong></article>
            <article className="metric modernMetric"><span>Outstanding balance</span><strong>฿0</strong></article>
          </div>

          <div className="card featureCard">
            <h2>Cloud foundation is ready</h2>
            <p>PIN unlock, PWA support, Supabase backend, and a clean base ready for your real dashboard and project features.</p>
            <div className="featureList">
              <div>• mobile-first login experience</div>
              <div>• admin can manage users and PIN</div>
              <div>• ready for the next expense modules</div>
            </div>
            <div className="actions">
              <a className="primary" href="/settings">Change PIN</a>
              <button className="secondary" disabled>Add expense — next step</button>
              <button className="secondary" disabled>Projects — next step</button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="center appBackdrop orbitTheme">
      <section className="loginCard refinedCard">
        <button
          className="houseSecret"
          aria-label="Admin Login"
          onClick={() => setAdminMode((value) => !value)}
        >
          ⌂
        </button>

        <div className="logoWrap">
          <OrbitMark />
        </div>

        <div className="titleBlock">
          <p className="eyebrow">EXPENSE ORBIT</p>
          <h1>{title}</h1>
          <p className="subtitle">{pinHint}</p>
        </div>

        {!selected ? (
          <div className="profileGrid refinedGrid">
            {profiles.map((profile) => (
              <button className="profile refinedProfile" key={profile.id} onClick={() => { setSelected(profile); setMessage(""); }}>
                <div className="avatar avatarGlow">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile.display_name.slice(0, 1).toUpperCase()}
                </div>
                <strong>{profile.display_name}</strong>
                <small>{profile.pin_is_set ? "tap to unlock" : "tap to create your PIN"}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="pinUnlockCard">
            <button className="back subtleBack" onClick={() => { setSelected(null); setMessage(""); }}>← เปลี่ยนผู้ใช้</button>
            <div className="selectedProfileMini">
              <div className="avatar miniAvatar">
                {selected.avatar_url ? <img src={selected.avatar_url} alt="" /> : selected.display_name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>{selected.display_name}</strong>
                <small>{selected.pin_is_set ? "unlock to continue" : pinStage === "create" ? "create your new PIN" : "confirm your PIN"}</small>
              </div>
            </div>

            <PinDots value={pin} />
            <div className="pinAutoStatus">
              <span>{submittingPin ? "กำลังตรวจสอบ PIN…" : "กรอกครบ 6 หลัก ระบบจะเข้าให้อัตโนมัติ"}</span>
              {pin.length > 0 && !submittingPin && (
                <button type="button" className="back clearPinButton" onClick={() => setPin("")}>ล้าง</button>
              )}
            </div>

            <PinKeypad onDigit={addDigit} onDelete={removeDigit} />
          </div>
        )}

        {adminMode && (
          <div className="adminRecovery glassSection">
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
