"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
      else setEmail(data.user.email ?? "");
    });
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <p>Xin chào: {email}</p>
      <button className="border rounded-md px-3 py-2" onClick={logout}>
        Đăng xuất
      </button>
    </div>
  );
}
