"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Subject = { id: string; name: string };
type Topic = { id: string; name: string; subject_id: string };

export default function AdminMaterialsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [type, setType] = useState<string>("lecture");
  const [url, setUrl] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const filteredTopics = useMemo(
    () => topics.filter((t) => t.subject_id === subjectId),
    [topics, subjectId]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();
      const r = prof?.role ?? "student";
      setRole(r);
      if (r !== "teacher" && r !== "admin") {
        setMsg("Bạn không có quyền truy cập trang này (cần teacher/admin).");
        return;
      }

      const { data: s } = await supabase.from("subjects").select("id,name").order("name");
      setSubjects((s ?? []) as Subject[]);

      const { data: t } = await supabase
        .from("topics")
        .select("id,name,subject_id")
        .order("name");
      setTopics((t ?? []) as Topic[]);
    })();
  }, [router]);

  const save = async () => {
    setMsg("");
    if (!title.trim()) return setMsg("Thiếu tiêu đề.");
    if (!url.trim()) return setMsg("Thiếu URL học liệu.");
    if (!type.trim()) return setMsg("Thiếu loại học liệu.");

    setSaving(true);
    const { error } = await supabase.from("materials").insert({
      title: title.trim(),
      description: description.trim() || null,
      type,
      url: url.trim(),
      subject_id: subjectId || null,
      topic_id: topicId || null,
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setDescription("");
    setType("lecture");
    setUrl("");
    setSubjectId("");
    setTopicId("");
    setMsg("Đã thêm học liệu.");
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Quản lý học liệu</h1>

      {msg ? <div className="text-sm text-red-600">{msg}</div> : null}

      {(role === "teacher" || role === "admin") ? (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-semibold">Tiêu đề</div>
              <input className="border rounded p-2 w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <div className="text-sm font-semibold">Loại</div>
              <select className="border rounded p-2 w-full" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="lecture">Bài giảng</option>
                <option value="textbook">Giáo trình</option>
                <option value="image">Hình ảnh</option>
                <option value="model3d">Mô hình 3D</option>
                <option value="link">Liên kết</option>
              </select>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold">Mô tả (tuỳ chọn)</div>
            <textarea className="border rounded p-2 w-full" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div>
            <div className="text-sm font-semibold">URL học liệu</div>
            <input className="border rounded p-2 w-full" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... (pdf/image/glb/google drive public link...)" />
            <div className="text-xs text-gray-600 mt-1">URL phải là public để sinh viên xem được.</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-semibold">Môn (tuỳ chọn)</div>
              <select
                className="border rounded p-2 w-full"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicId("");
                }}
              >
                <option value="">-- Không chọn --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-sm font-semibold">Chủ đề (tuỳ chọn)</div>
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
          </div>

          <button className="bg-black text-white rounded px-4 py-2 disabled:opacity-50" onClick={save} disabled={saving}>
            {saving ? "Đang lưu..." : "Thêm học liệu"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
