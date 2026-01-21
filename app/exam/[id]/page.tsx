"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type ExamRow = {
  id: string;
  duration_seconds: number;
  status: "in_progress" | "submitted";
  started_at: string; // timestamptz
};

type Question = {
  id: string;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  correct_answer: string; // "A" or "A,C"
  explanation: string | null;
  qtype: string; // single | multi
};

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function norm(input: string) {
  return (input ?? "")
    .toUpperCase()
    .replace(/;/g, ",")
    .replace(/\s+/g, "")
    .trim();
}

function optionList(q: Question) {
  return [
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c },
    { key: "D", text: q.option_d },
    { key: "E", text: q.option_e },
  ].filter((o) => o.text && String(o.text).trim().length > 0) as { key: string; text: string }[];
}

export default function ExamPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const examId = params?.id;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [exam, setExam] = useState<ExamRow | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);

  // question_id -> "A" or "A,C"
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // autosave debounce
  const saveTimer = useRef<any>(null);
  const lastSaved = useRef<Record<string, string>>({});

  // Guard id
  if (!examId || typeof examId !== "string" || !isUUID(examId)) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-red-600 text-sm">Mã đề không hợp lệ.</div>
        <button className="border rounded px-3 py-2" onClick={() => router.push("/practice")}>
          Quay lại luyện thi
        </button>
      </div>
    );
  }

  // Load exam + questions + existing answers (resume)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      // 1) exam
      const { data: examRow, error: examErr } = await supabase
        .from("exams")
        .select("id,duration_seconds,status,started_at")
        .eq("id", examId)
        .single();

      if (examErr || !examRow) {
        setMsg(`Không tải được đề: ${examErr?.message ?? "unknown"}`);
        setLoading(false);
        return;
      }

      const e = examRow as ExamRow;
      setExam(e);

      // timer from started_at (no reset on refresh)
      const startedAtMs = new Date(e.started_at).getTime();
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      setTimeLeft(Math.max(0, e.duration_seconds - elapsed));

      // 2) questions (ordered)
      const { data: eqRows, error: eqErr } = await supabase
        .from("exam_questions")
        .select(
          "sort_order, questions:question_id (id,question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,qtype)"
        )
        .eq("exam_id", examId)
        .order("sort_order", { ascending: true });

      if (eqErr || !eqRows) {
        setMsg(`Không tải được câu hỏi: ${eqErr?.message ?? "unknown"}`);
        setLoading(false);
        return;
      }

      const qs: Question[] = (eqRows as any[]).map((r) => r.questions).filter(Boolean);
      setQuestions(qs);

      // 3) existing answers (resume)
      const { data: aRows, error: aErr } = await supabase
        .from("answers")
        .select("question_id,selected_answer")
        .eq("exam_id", examId);

      if (!aErr && aRows?.length) {
        const map: Record<string, string> = {};
        for (const r of aRows as any[]) {
          if (r.question_id) map[r.question_id] = norm(r.selected_answer || "");
        }
        setAnswers(map);
        lastSaved.current = map;
      } else {
        lastSaved.current = {};
      }

      setLoading(false);

      // Nếu exam đã submitted thì chuyển sang trang chữa luôn
      if (e.status === "submitted") {
        router.replace(`/result/${examId}`);
      }
    })();
  }, [examId, router]);

  // Countdown tick
  useEffect(() => {
    if (!exam) return;
    if (exam.status !== "in_progress") return;
    if (loading) return;

    const t = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(t);
  }, [exam, loading]);

  // Auto submit when time runs out
  useEffect(() => {
    if (!exam) return;
    if (exam.status !== "in_progress") return;
    if (loading) return;
    if (questions.length === 0) return;

    if (timeLeft === 0 && !submitting) {
      submitExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, loading, questions.length, exam, submitting]);

  // Helpers to set answers locally
  const setSingle = (qid: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: choice }));
  };

  const toggleMulti = (qid: string, choice: string) => {
    setAnswers((prev) => {
      const cur = norm(prev[qid] || "");
      const parts = cur ? cur.split(",").filter(Boolean) : [];
      const idx = parts.indexOf(choice);
      if (idx >= 0) parts.splice(idx, 1);
      else parts.push(choice);
      parts.sort();
      return { ...prev, [qid]: parts.join(",") };
    });
  };

  // Autosave answers (debounced)
  useEffect(() => {
    if (loading) return;
    if (!exam) return;
    if (exam.status !== "in_progress") return;

    // compare with lastSaved
    const changed = JSON.stringify(answers) !== JSON.stringify(lastSaved.current);
    if (!changed) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        // Build payload only for answered questions
        const payload = Object.entries(answers)
          .filter(([, v]) => norm(v).length > 0)
          .map(([qid, v]) => ({
            exam_id: examId,
            question_id: qid,
            selected_answer: norm(v),
          }));

        if (payload.length > 0) {
          const { error } = await supabase.from("answers").upsert(payload, {
            onConflict: "exam_id,question_id",
          });
          if (!error) {
            lastSaved.current = { ...answers };
          }
        }
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, loading, exam, examId]);

  // Submit: compute correctness, upsert answers with is_correct, update exam, goto result
  const submitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    setMsg("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      // compute score
      let correct = 0;
      const detail = questions.map((q) => {
        const selected = norm(answers[q.id] || "");
        const gold = norm(q.correct_answer || "");
        const is_correct = selected.length > 0 && selected === gold;
        if (is_correct) correct += 1;
        return { qid: q.id, selected, is_correct };
      });

      // save answers with correctness
      const payload = detail.map((d) => ({
        exam_id: examId,
        question_id: d.qid,
        selected_answer: d.selected || null,
        is_correct: d.is_correct,
      }));

      const { error: ansErr } = await supabase.from("answers").upsert(payload, {
        onConflict: "exam_id,question_id",
      });
      if (ansErr) {
        setMsg(`Lỗi lưu bài: ${ansErr.message}`);
        setSubmitting(false);
        return;
      }

      // mark exam submitted
      const { error: examErr } = await supabase
        .from("exams")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", examId);

      if (examErr) {
        setMsg(`Lỗi cập nhật trạng thái: ${examErr.message}`);
        setSubmitting(false);
        return;
      }

      // stop timer locally
      setExam((prev) => (prev ? { ...prev, status: "submitted" } : prev));
      setTimeLeft(0);

      // go to result page (chữa đáp án)
      router.push(`/result/${examId}`);
    } catch (e: any) {
      setMsg(e?.message ?? "Lỗi không xác định");
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((v) => norm(v).length > 0).length;
  }, [answers]);

  if (loading) return <div className="p-6">Đang tải đề thi...</div>;

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
        <h1 className="text-xl font-bold">Làm bài</h1>
        <div className="text-sm flex items-center gap-3">
          <span>
            <span className="font-semibold">Thời gian:</span>{" "}
            <span className={timeLeft <= 30 ? "text-red-600 font-bold" : ""}>
              {formatTime(timeLeft)}
            </span>
          </span>
          <span className="text-xs text-gray-600">{saving ? "Đang lưu..." : "Đã lưu"}</span>
        </div>
      </div>

      <div className="text-sm border rounded p-3 flex items-center justify-between">
        <div>
          Đã trả lời: <b>{answeredCount}</b> / {questions.length}
        </div>

        <button
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          onClick={submitExam}
          disabled={submitting}
        >
          {submitting ? "Đang nộp..." : "Nộp bài"}
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const selected = norm(answers[q.id] || "");
          const isMulti = (q.qtype || "single") === "multi";
          const opts = optionList(q);

          return (
            <div key={q.id} className="border rounded-lg p-4 space-y-3">
              <div className="font-semibold">
                Câu {idx + 1}: {q.question_text}
              </div>

              <div className="space-y-2">
                {opts.map((o) => {
                  const checked = isMulti
                    ? selected.split(",").filter(Boolean).includes(o.key)
                    : selected === o.key;

                  return (
                    <label key={o.key} className="flex items-start gap-2 cursor-pointer">
                      <input
                        type={isMulti ? "checkbox" : "radio"}
                        name={`q_${q.id}`}
                        checked={checked}
                        onChange={() => {
                          if (isMulti) toggleMulti(q.id, o.key);
                          else setSingle(q.id, o.key);
                        }}
                      />
                      <div>
                        <b>{o.key}.</b> {o.text}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="text-xs text-gray-600">
                Loại: {isMulti ? "Nhiều đáp án" : "1 đáp án"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
