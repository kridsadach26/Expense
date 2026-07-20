"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function LogoutPage() {
  const [message, setMessage] = useState("กำลังออกจากระบบ…");

  useEffect(() => {
    let active = true;

    async function logout() {
      try {
        // Clear the selected profile session first.
        await supabase.rpc("logout_app_profile");

        // Remove the anonymous/admin Supabase auth session from this browser.
        await supabase.auth.signOut({ scope: "local" });

        // Clear only login-related local values. Expense data remains untouched.
        localStorage.removeItem("home-expense-user");
        sessionStorage.clear();

        if (active) {
          window.location.replace("/");
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setMessage("ออกจากระบบไม่สำเร็จ กำลังกลับหน้าเข้าสู่ระบบ…");
          setTimeout(() => window.location.replace("/"), 900);
        }
      }
    }

    logout();
    return () => { active = false; };
  }, []);

  return (
    <main className="center appBackdrop">
      <section className="card softCard" style={{ textAlign: "center", minWidth: 260 }}>
        {message}
      </section>
    </main>
  );
}
