"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type Row = {
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  questions: {
    id: string;
    question_text: string;
    option_a: string | null;
    option_b: string | null;
    option_c: string | null;
    option_d: string | null;
    option_e: string | null;
    correct_answer: string;
    explanation: string | null;
  };
};

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function norm(s: string) {
  return (s ?? "").toUpperCase().replace(/;/g, ",").replace(/\s+/g, "").trim();
}

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const examId = params?.id;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const score = useMemo(() => {
    const total = rows.length;
    const correct = rows.filter((r) => r.is_correct).length;
    return { correct, total };
  }, [rows]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      if (!examId || typeof examId !== "string" || !isUUID(examId)) {
        setMsg("Mã đề không hợp lệ.");
        setLoading(false);
        return;
      }

      // Lấy answers + join questions
      const { data, error } = await supabase
        .from("answers")
        .select(
          "question_id,selected_answer,is_correct, questions:question_id (id,question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation)"
        )
        .eq("exam_id", examId);

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      const r = (data ?? []) as any as Row[];
      if (!r.length) {
        setMsg("Chưa có dữ liệu chữa đáp án. Hãy chắc chắn bạn đã nộp bài.");
        setLoading(false);
        return;
      }

      setRows(r);
      setLoading(false);
    })();
  }, [examId, router]);

  if (loading) return <div className="p-6">Đang tải trang chữa...</div>;

  if (msg) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-red-600 text-sm">{msg}</div>
        <button className="border rounded px-3 py-2" onClick={() => router.push("/practice")}>
          Quay lại luyện thi
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Chữa đáp án</h1>
        <div className="text-sm">
          Điểm: <b>{score.correct}</b> / {score.total}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="border rounded px-3 py-2" onClick={() => router.push("/practice")}>
          Làm đề khác
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((r, idx) => {
          const q = r.questions;
          const selected = norm(r.selected_answer || "");
          const gold = norm(q.correct_answer || "");
          const ok = selected && selected === gold;

          const options = [
            { k: "A", t: q.option_a },
            { k: "B", t: q.option_b },
            { k: "C", t: q.option_c },
            { k: "D", t: q.option_d },
            { k: "E", t: q.option_e },
          ].filter((o) => o.t && String(o.t).trim().length > 0) as { k: string; t: string }[];

          return (
            <div key={r.question_id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">
                  Câu {idx + 1}: {q.question_text}
                </div>
                <div className={`text-sm font-semibold ${ok ? "text-green-700" : "text-red-700"}`}>
                  {ok ? "Đúng" : "Sai"}
                </div>
              </div>

              <div className="text-sm">
                Bạn chọn:{" "}
                <b className={ok ? "text-green-700" : "text-red-700"}>
                  {selected || "(Chưa chọn)"}
                </b>{" "}
                | Đúng: <b>{gold}</b>
              </div>

              <div className="space-y-1 text-sm">
                {options.map((o) => {
                  const chosen = selected.split(",").filter(Boolean).includes(o.k);
                  const correct = gold.split(",").filter(Boolean).includes(o.k);
                  return (
                    <div key={o.k}>
                      <b>{o.k}.</b> {o.t}{" "}
                      {correct ? <span className="text-green-700">(Đáp án đúng)</span> : null}
                      {chosen && !correct ? <span className="text-red-700">(Bạn chọn)</span> : null}
                      {chosen && correct ? <span className="text-green-700">(Bạn chọn)</span> : null}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="text-sm bg-gray-50 border rounded p-2">
                  <b>Giải thích:</b> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
