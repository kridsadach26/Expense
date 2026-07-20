"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function SettingsPage() {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.rpc("current_app_profile").then(({ data }) => {
      if (!data?.length) window.location.href = "/";
    });
  }, []);

  async function changePin() {
    if (!/^\d{6}$/.test(newPin)) {
      setMessage("PIN ใหม่ต้องเป็นตัวเลข 6 หลัก");
      return;
    }
    if (newPin !== confirmPin) {
      setMessage("PIN ใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }

    const { data, error } = await supabase.rpc("change_profile_pin", {
      p_old_pin: oldPin,
      p_new_pin: newPin,
    });
    setMessage(error?.message ?? data?.message ?? "เปลี่ยน PIN แล้ว");
    if (data?.ok) {
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
    }
  }

  return (
    <main className="center">
      <section className="loginCard">
        <a href="/" className="back">← กลับ</a>
        <h1>เปลี่ยน PIN</h1>
        <label>PIN เดิม</label>
        <input type="password" inputMode="numeric" maxLength={6} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} />
        <label>PIN ใหม่</label>
        <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} />
        <label>ยืนยัน PIN ใหม่</label>
        <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} />
        <button className="primary" onClick={changePin}>บันทึก PIN ใหม่</button>
        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}
