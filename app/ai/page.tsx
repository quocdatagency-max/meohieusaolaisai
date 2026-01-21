"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Msg = { role: "user" | "assistant"; text: string };

export default function AIPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Tôi có thể giúp bạn: giải thích kiến thức, chữa câu hỏi trắc nghiệm, gợi ý ôn tập theo chương, tạo đề luyện theo chủ đề.\n\nGợi ý: hãy dán câu hỏi hoặc mô tả phần bạn đang học.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push("/login");
    })();
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    setErr("");
    const text = input.trim();
    if (!text) return;
    setInput("");
    setLoading(true);

    const next = [...messages, { role: "user", text } as Msg];
    setMessages(next);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const raw = await res.text();
      const json = raw ? JSON.parse(raw) : null;

      if (!res.ok) {
        setErr(json?.error || raw || `Lỗi AI (HTTP ${res.status})`);
        setLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", text: json?.text ?? "(Không có phản hồi)" }]);
    } catch (e: any) {
      setErr(e?.message ?? "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">AI hỗ trợ học</h1>

      <div className="border rounded-lg p-4 h-[65vh] overflow-auto space-y-3 bg-white">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[90%] border rounded-lg px-3 py-2 text-sm whitespace-pre-wrap " +
                (m.role === "user" ? "bg-gray-900 text-white" : "bg-gray-50")
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <div className="border rounded-lg p-3 flex gap-2">
        <textarea
          className="border rounded p-2 w-full"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi hoặc nội dung cần giải thích..."
        />
        <button
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          onClick={send}
          disabled={loading}
        >
          {loading ? "Đang trả lời..." : "Gửi"}
        </button>
      </div>

      <div className="text-xs text-gray-600">
        Lưu ý: để dùng AI, bạn cần cấu hình biến môi trường <b>OPENAI_API_KEY</b> trên máy chạy / Vercel.
      </div>
    </div>
  );
}
