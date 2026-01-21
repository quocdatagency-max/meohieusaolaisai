"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Subject = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  name: string;
  subject_id: string;
};

export default function PracticePage() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");

  const [totalQuestions, setTotalQuestions] = useState(20);
  const [minutes, setMinutes] = useState(20);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => t.subject_id === subjectId);
  }, [topics, subjectId]);

  // Load user + subjects + topics
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: s } = await supabase
        .from("subjects")
        .select("id,name")
        .order("name");
      setSubjects((s ?? []) as Subject[]);

      const { data: t } = await supabase
        .from("topics")
        .select("id,name,subject_id")
        .order("name");
      setTopics((t ?? []) as Topic[]);
    })();
  }, [router]);

  // Start exam
  const start = async () => {
    setMsg("");
    setLoading(true);

    try {
      if (!subjectId) {
        setMsg("Hãy chọn môn học.");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
const access_token = sessionData.session?.access_token;

if (!access_token) {
  setMsg("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
  router.push("/login");
  setLoading(false);
  return;
}

const res = await fetch("/api/exams/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${access_token}`,
  },
  body: JSON.stringify({
    subject_id: subjectId,
    topic_id: topicId || null,
    total_questions: totalQuestions,
    duration_seconds: minutes * 60,
  }),
});


      const text = await res.text();

      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        setMsg(json?.error || text || `Lỗi tạo đề (HTTP ${res.status})`);
        setLoading(false);
        return;
      }

      if (!json?.exam_id) {
        setMsg("API không trả exam_id. Kiểm tra /api/exams/create.");
        setLoading(false);
        return;
      }

      router.push(`/exam/${json.exam_id}`);
    } catch (e: any) {
      setMsg(e?.message ?? "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold">Luyện thi</h1>

      <div className="border rounded-lg p-4 space-y-3">
        <div>
          <label className="text-sm font-semibold">Môn học</label>
          <select
            className="border rounded p-2 w-full"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId("");
            }}
          >
            <option value="">-- Chọn môn --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold">Chủ đề (tùy chọn)</label>
          <select
            className="border rounded p-2 w-full"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            disabled={!subjectId}
          >
            <option value="">-- Không chọn --</option>
            {filteredTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold">Số câu</label>
            <input
              type="number"
              min={1}
              className="border rounded p-2 w-full"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Thời gian (phút)</label>
            <input
              type="number"
              min={1}
              className="border rounded p-2 w-full"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          onClick={start}
          disabled={loading}
          className="bg-black text-white rounded p-2 w-full disabled:opacity-50"
        >
          {loading ? "Đang tạo đề..." : "Bắt đầu"}
        </button>

        {msg && <div className="text-sm text-red-600">{msg}</div>}
      </div>
    </div>
  );
}
