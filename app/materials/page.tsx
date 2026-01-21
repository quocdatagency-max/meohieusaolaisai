"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Subject = { id: string; name: string };
type Topic = { id: string; name: string; subject_id: string };

type Material = {
  id: string;
  title: string;
  description: string | null;
  type: string; // lecture | textbook | image | model3d | link
  url: string;
  subject_id: string | null;
  topic_id: string | null;
  created_at: string;
};

export default function MaterialsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  const filteredTopics = useMemo(
    () => topics.filter((t) => t.subject_id === subjectId),
    [topics, subjectId]
  );

  const filteredMaterials = useMemo(() => {
    let rows = [...materials];
    if (subjectId) rows = rows.filter((m) => m.subject_id === subjectId);
    if (topicId) rows = rows.filter((m) => m.topic_id === topicId);
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter(
        (m) =>
          m.title.toLowerCase().includes(s) ||
          (m.description ?? "").toLowerCase().includes(s)
      );
    }
    return rows;
  }, [materials, subjectId, topicId, q]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
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

      const { data: m, error } = await supabase
        .from("materials")
        .select("id,title,description,type,url,subject_id,topic_id,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setMsg(
          "Không tải được học liệu. Nếu bạn chưa tạo bảng materials, hãy tạo theo SQL hướng dẫn."
        );
        setMaterials([]);
      } else {
        setMsg("");
        setMaterials((m ?? []) as Material[]);
      }
    })();
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Bài giảng & giáo trình</h1>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm font-semibold">Môn</div>
            <select
              className="border rounded p-2 w-full"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId("");
              }}
            >
              <option value="">-- Tất cả --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-sm font-semibold">Chủ đề</div>
            <select
              className="border rounded p-2 w-full"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              disabled={!subjectId}
            >
              <option value="">-- Tất cả --</option>
              {filteredTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-sm font-semibold">Tìm kiếm</div>
            <input
              className="border rounded p-2 w-full"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên tài liệu, mô tả..."
            />
          </div>
        </div>
      </div>

      {msg ? <div className="text-sm text-red-600">{msg}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredMaterials.map((m) => (
          <Link
            key={m.id}
            href={`/materials/${m.id}`}
            className="border rounded-lg p-4 hover:bg-gray-50"
          >
            <div className="font-semibold">{m.title}</div>
            <div className="text-xs text-gray-600">{m.type}</div>
            {m.description ? (
              <div className="text-sm mt-2 line-clamp-2">{m.description}</div>
            ) : null}
          </Link>
        ))}
      </div>

      {!msg && filteredMaterials.length === 0 ? (
        <div className="text-sm text-gray-600">Chưa có học liệu phù hợp.</div>
      ) : null}
    </div>
  );
}
