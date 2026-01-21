import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="med-card overflow-hidden">
        <img
          src="/medical-banner.svg"
          alt="Khoa Y – Trường Cao đẳng Y tế Phú Thọ | Phần mềm Học tập"
          className="w-full h-auto"
        />
      </div>

      <div className="med-card p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            Khoa Y Trường Cao đẳng Y tế Phú Thọ
          </h1>
          <div className="med-badge w-fit">
            <span aria-hidden>🩺</span>
            <span className="font-semibold">Phần mềm Học tập</span>
          </div>
          <p className="text-sm md:text-base" style={{ color: "var(--med-muted)" }}>
            Ứng dụng ôn tập: thi thử trắc nghiệm theo môn/chủ đề, xem bài giảng & giáo trình, và hỏi AI hỗ trợ.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/practice" className="med-link-card p-5">
          <div className="text-sm font-semibold" style={{ color: "var(--med-primary)" }}>
            Thi thử
          </div>
          <div className="mt-1 text-lg font-bold">Trắc nghiệm theo môn/chủ đề</div>
          <div className="mt-2 text-sm" style={{ color: "var(--med-muted)" }}>
            Chọn môn, số câu, thời gian và làm bài như thi thật.
          </div>
        </Link>

        <Link href="/materials" className="med-link-card p-5">
          <div className="text-sm font-semibold" style={{ color: "var(--med-accent)" }}>
            Tài liệu
          </div>
          <div className="mt-1 text-lg font-bold">Bài giảng & giáo trình</div>
          <div className="mt-2 text-sm" style={{ color: "var(--med-muted)" }}>
            PDF, hình ảnh, mô hình, liên kết—tập trung theo học phần.
          </div>
        </Link>

        <Link href="/ai" className="med-link-card p-5">
          <div className="text-sm font-semibold" style={{ color: "var(--med-primary-2)" }}>
            AI hỗ trợ
          </div>
          <div className="mt-1 text-lg font-bold">Giải thích & gợi ý ôn tập</div>
          <div className="mt-2 text-sm" style={{ color: "var(--med-muted)" }}>
            Chữa câu hỏi, giải thích khái niệm, gợi ý lộ trình học.
          </div>
        </Link>
      </div>
    </div>
  );
}
