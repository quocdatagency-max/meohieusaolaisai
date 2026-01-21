"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NavBar() {
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setEmail("");
        setRole("");
        return;
      }
      setEmail(data.user.email ?? "");

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();
      setRole(prof?.role ?? "student");
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header
      className="border-b sticky top-0 z-50"
      style={{
        borderColor: "var(--med-border)",
        background: "linear-gradient(90deg, var(--med-primary), var(--med-accent))",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="font-semibold leading-tight min-w-0">
            <span className="block truncate">Khoa Y Trường Cao đẳng Y tế Phú Thọ</span>
            <span className="block text-xs text-white/85 truncate">Phần mềm Học tập</span>
          </Link>

          <nav className="hidden md:flex items-center gap-3 text-sm">
            <Link href="/practice" className="rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
              Thi thử
            </Link>
            <Link href="/materials" className="rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
              Tài liệu
            </Link>
            <Link href="/ai" className="rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
              AI hỗ trợ
            </Link>
            {role === "admin" && (
              <Link href="/admin/materials" className="rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
                Quản trị
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {!!email && (
            <span className="hidden sm:inline rounded-lg bg-white/10 px-3 py-2">
              {email}
            </span>
          )}
          {!!email ? (
            <button
              onClick={logout}
              className="rounded-lg bg-white/15 px-3 py-2 hover:bg-white/20 transition"
              type="button"
            >
              Đăng xuất
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-white/15 px-3 py-2 hover:bg-white/20 transition"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
        <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap gap-2 text-sm text-white">
          <Link href="/practice" className="rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
            Thi thử
          </Link>
          <Link href="/materials" className="rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
            Tài liệu
          </Link>
          <Link href="/ai" className="rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
            AI hỗ trợ
          </Link>
          {role === "admin" && (
            <Link href="/admin/materials" className="rounded-lg px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 transition">
              Quản trị
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
