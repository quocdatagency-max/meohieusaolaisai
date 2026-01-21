"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";

type Material = {
  id: string;
  title: string;
  description: string | null;
  type: string; // lecture | textbook | image | model3d | link
  url: string;
  created_at: string;
};

function isUUID(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function inferKind(m: Material) {
  const u = (m.url || "").toLowerCase();
  if (m.type === "model3d") return "model3d";
  if (m.type === "image") return "image";
  if (u.endsWith(".glb") || u.endsWith(".gltf")) return "model3d";
  if (u.endsWith(".png") || u.endsWith(".jpg") || u.endsWith(".jpeg") || u.endsWith(".webp")) return "image";
  if (u.endsWith(".pdf")) return "pdf";
  return "link";
}

export default function MaterialDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");
  const [material, setMaterial] = useState<Material | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }

      if (!id || typeof id !== "string" || !isUUID(id)) {
        setMsg("Mã học liệu không hợp lệ.");
        setLoading(false);
        return;
      }

      const { data: m, error } = await supabase
        .from("materials")
        .select("id,title,description,type,url,created_at")
        .eq("id", id)
        .single();

      if (error || !m) {
        setMsg(error?.message ?? "Không tải được học liệu.");
        setMaterial(null);
      } else {
        setMsg("");
        setMaterial(m as Material);
      }
      setLoading(false);
    })();
  }, [id, router]);

  const kind = useMemo(() => (material ? inferKind(material) : "link"), [material]);

  if (loading) return <div>Đang tải...</div>;
  if (msg) return <div className="text-sm text-red-600">{msg}</div>;
  if (!material) return <div className="text-sm text-gray-600">Không có dữ liệu.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{material.title}</h1>
          {material.description ? (
            <div className="text-sm text-gray-700 mt-2">{material.description}</div>
          ) : null}
        </div>
        <button className="border rounded px-3 py-2" onClick={() => router.push("/materials")}
        >
          Quay lại
        </button>
      </div>

      {kind === "pdf" ? (
        <iframe
          src={material.url}
          className="w-full h-[80vh] border rounded"
          title={material.title}
        />
      ) : null}

      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={material.url} alt={material.title} className="max-w-full border rounded" />
      ) : null}

      {kind === "model3d" ? (
        <>
          <Script
            type="module"
            src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
          />
          <div className="border rounded p-3">
            {/* @ts-ignore */}
            <model-viewer
              src={material.url}
              ar
              camera-controls
              auto-rotate
              style={{ width: "100%", height: "70vh" }}
            />
          </div>
          <div className="text-xs text-gray-600">
            Gợi ý: nếu model không hiển thị, hãy đảm bảo link .glb/.gltf là public và cho phép truy cập.
          </div>
        </>
      ) : null}

      {kind === "link" ? (
        <div className="border rounded p-4">
          <div className="text-sm">Mở học liệu:</div>
          <a className="text-blue-600 underline" href={material.url} target="_blank" rel="noreferrer">
            {material.url}
          </a>
        </div>
      ) : null}
    </div>
  );
}
