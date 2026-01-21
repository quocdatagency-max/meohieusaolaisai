"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) return setError("Vui lòng nhập email và mật khẩu.");

    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        alert("Đăng ký thành công. Hãy đăng nhập.");
        setIsSignup(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">{isSignup ? "Đăng ký" : "Đăng nhập"}</h1>

        <input
          className="w-full border rounded-md p-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border rounded-md p-2"
          placeholder="Mật khẩu"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="w-full bg-black text-white rounded-md p-2" onClick={handleSubmit}>
          {isSignup ? "Tạo tài khoản" : "Đăng nhập"}
        </button>

        <button className="w-full border rounded-md p-2" onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký"}
        </button>
      </div>
    </div>
  );
}
