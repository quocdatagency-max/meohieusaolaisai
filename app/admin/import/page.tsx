"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import type { ParseError, ParseResult } from "papaparse";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Subject = { id: string; name: string };
type Topic = { id: string; name: string; subject_id: string };

type CSVRow = Record<string, unknown>;

function parseCSV(text: string): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    // KHÔNG dùng Papa.parse<CSVRow>(...) vì build của bạn coi parse là "untyped"
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,

      // để Papa tự đoán delimiter, đừng set delimiter:""
      transformHeader: (h: string) => h.replace(/^\uFEFF/, "").trim(),
      transform: (v: unknown) => (typeof v === "string" ? v.trim() : v),

      complete: (results: any) => {
        const errors = results?.errors ?? [];
        if (errors.length) {
          const first = errors[0];
          reject(
            new Error(
              `CSV parse error (row ${first?.row ?? "?"}): ${first?.message ?? "Unknown error"}`
            )
          );
          return;
        }
        resolve((results?.data ?? []) as CSVRow[]);
      },

      error: (err: any) => reject(err),
    });
  });
}


function normalizeCorrectAnswer(input: any): string {
  // Cho phép: "c" -> "C", "A; C" -> "A,C"
  // Loại bỏ khoảng trắng
  const s = String(input ?? "")
    .toUpperCase()
    .replace(/;/g, ",")
    .replace(/\s+/g, "")
    .trim();

  return s;
}

function normalizeDifficulty(input: any): string {
  const s = String(input ?? "").toLowerCase().trim();
  if (["easy", "medium", "hard"].includes(s)) return s;
  // chấp nhận tiếng Việt nếu bạn nhập
  if (["dễ", "de"].includes(s)) return "easy";
  if (["vừa", "vua", "trungbinh", "trung_binh", "tb"].includes(s)) return "medium";
  if (["khó", "kho"].includes(s)) return "hard";
  return "medium";
}

function normalizeQType(input: any): string {
  const s = String(input ?? "").toLowerCase().trim();
  if (["single", "multi", "truefalse"].includes(s)) return s;
  // cho phép nhập "one"/"multiple"
  if (["one", "singlechoice", "single_choice"].includes(s)) return "single";
  if (["multiple", "multichoice", "multi_choice"].includes(s)) return "multi";
  return "single";
}

export default function ImportPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState<string>("");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");

  const [fileName, setFileName] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [previewCount, setPreviewCount] = useState<number>(0);

  const filteredTopics = useMemo(
    () => topics.filter((t) => t.subject_id === subjectId),
    [topics, subjectId]
  );

  useEffect(() => {
    // Require login
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserEmail(data.user.email ?? "");

      // load role from profiles
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (profErr) {
        // Nếu bạn chưa tạo profiles/trigger thì sẽ lỗi, báo rõ
        setRole("student");
        setStatus(
          "Không đọc được role từ bảng profiles. Hãy đảm bảo bạn đã tạo bảng profiles + trigger, hoặc set role=teacher cho tài khoản."
        );
      } else {
        setRole(prof?.role ?? "student");
      }
    })();

    // Load subjects/topics
    (async () => {
      const { data: s } = await supabase.from("subjects").select("id,name").order("name");
      setSubjects((s ?? []) as Subject[]);

      const { data: t } = await supabase
        .from("topics")
        .select("id,name,subject_id")
        .order("name");
      setTopics((t ?? []) as Topic[]);
    })();
  }, [router]);

  const onPickFile = async (file: File | null) => {
    setStatus("");
    setPreviewCount(0);

    if (!file) return;
    setFileName(file.name);

    if (!subjectId) {
      setStatus("Hãy chọn môn (subject) trước khi import.");
      return;
    }

    if (role !== "teacher" && role !== "admin") {
      setStatus("Bạn không có quyền import. (Cần role teacher/admin)");
      return;
    }

    setStatus("Đang đọc file CSV...");
    const text = await file.text();

    let rows: CSVRow[] = [];
    try {
      rows = await parseCSV(text);
    } catch (e: any) {
      setStatus(`Lỗi đọc CSV: ${e?.message ?? String(e)}`);
      return;
    }

    if (!rows.length) {
      setStatus("CSV không có dữ liệu (không có dòng nào).");
      return;
    }

    // Check required headers
    const required = ["question_text", "correct_answer"];
    const missing = required.filter((k) => !(k in rows[0]));
    if (missing.length) {
      setStatus(
        `CSV thiếu cột bắt buộc: ${missing.join(", ")}. Hãy kiểm tra header (dòng 1).`
      );
      return;
    }

    // Build payload
    const payload = rows.map((r) => {
      const correct = normalizeCorrectAnswer(r.correct_answer);
      return {
        subject_id: subjectId,
        topic_id: topicId || null,
        question_text: String(r.question_text ?? "").trim(),
        option_a: r.option_a ? String(r.option_a).trim() : null,
        option_b: r.option_b ? String(r.option_b).trim() : null,
        option_c: r.option_c ? String(r.option_c).trim() : null,
        option_d: r.option_d ? String(r.option_d).trim() : null,
        option_e: r.option_e ? String(r.option_e).trim() : null,
        correct_answer: correct,
        explanation: r.explanation ? String(r.explanation).trim() : null,
        difficulty: normalizeDifficulty(r.difficulty),
        qtype: normalizeQType(r.qtype),
        image_url: r.image_url ? String(r.image_url).trim() : null,
      };
    });

    // Validate minimal
    const bad = payload
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => !p.question_text || !p.correct_answer);

    if (bad.length > 0) {
      const first = bad[0];
      setStatus(
        `CSV có ${bad.length} dòng thiếu question_text hoặc correct_answer. Ví dụ lỗi ở dòng dữ liệu #${
          first.idx + 2
        } (tính cả header).`
      );
      return;
    }

    setPreviewCount(Math.min(payload.length, 5));
    setStatus(`Đang import ${payload.length} câu hỏi...`);

    // Insert
    const { error } = await supabase.from("questions").insert(payload);

    if (error) {
      setStatus(`Lỗi import: ${error.message}`);
      return;
    }

    setStatus(`Import thành công ${payload.length} câu. File: ${file.name}`);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Import ngân hàng câu hỏi (CSV)</h1>

      <div className="text-sm space-y-1">
        <div>User: {userEmail || "..."}</div>
        <div>Role: {role || "..."}</div>
      </div>

      <div className="space-y-3 border rounded-lg p-4">
        <div className="space-y-2">
          <label className="block text-sm font-semibold">Chọn môn (subject)</label>
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

        <div className="space-y-2">
          <label className="block text-sm font-semibold">Chọn chủ đề (topic, tùy chọn)</label>
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

        <div className="space-y-2">
          <label className="block text-sm font-semibold">Upload CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            disabled={role !== "teacher" && role !== "admin"}
          />
          {fileName && <div className="text-sm">File: {fileName}</div>}
          {(role !== "teacher" && role !== "admin") && (
            <div className="text-sm text-red-600">
              Bạn cần role teacher/admin để import. Hãy set role trong bảng profiles.
            </div>
          )}
        </div>
      </div>

      {status && <div className="text-sm border rounded p-3">{status}</div>}

      <div className="text-sm border rounded p-4 space-y-2">
        <div className="font-semibold">CSV cần các cột (header) như sau:</div>
        <pre className="bg-gray-50 p-2 rounded overflow-auto">
question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,difficulty,qtype,image_url
        </pre>
        <div>
          Ghi chú:
          <ul className="list-disc pl-5">
            <li>CSV có thể chứa dấu phẩy trong nội dung (PapaParse xử lý đúng).</li>
            <li>correct_answer: A/B/C/D hoặc A,C (nhiều đáp án).</li>
            <li>difficulty: easy/medium/hard (không có sẽ mặc định medium).</li>
            <li>qtype: single/multi (không có sẽ mặc định single).</li>
          </ul>
        </div>
        {previewCount > 0 && (
          <div className="text-sm">
            Đã chuẩn bị payload (xem trước {previewCount} dòng đầu trong bộ nhớ), đang/đã import.
          </div>
        )}
      </div>
    </div>
  );
}
