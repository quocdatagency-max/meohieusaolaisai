import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }
    const access_token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${access_token}` } },
      }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const subject_id = body.subject_id;
    const topic_id = body.topic_id ?? null;
    const total_questions = Number(body.total_questions);
    const duration_seconds = Number(body.duration_seconds);

    if (!subject_id || !total_questions || !duration_seconds) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let q = supabase.from("questions").select("id").eq("subject_id", subject_id);
    if (topic_id) q = q.eq("topic_id", topic_id);

    const { data: questions, error: qErr } = await q;
    if (qErr || !questions) {
      return NextResponse.json({ error: `Load questions failed: ${qErr?.message ?? "unknown"}` }, { status: 400 });
    }

    if (questions.length < total_questions) {
      return NextResponse.json(
        { error: `Không đủ câu hỏi. Hiện có ${questions.length}, cần ${total_questions}.` },
        { status: 400 }
      );
    }

    const ids = questions.map((x) => x.id).sort(() => 0.5 - Math.random());
    const chosen = ids.slice(0, total_questions);

    const { data: exam, error: examErr } = await supabase
      .from("exams")
      .insert({
        user_id: userData.user.id,
        subject_id,
        topic_id,
        total_questions,
        duration_seconds,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (examErr) {
      return NextResponse.json({ error: `Create exam failed: ${examErr.message}` }, { status: 400 });
    }

    const payload = chosen.map((qid, idx) => ({
      exam_id: exam.id,
      question_id: qid,
      sort_order: idx + 1,
    }));

    const { error: eqErr } = await supabase.from("exam_questions").insert(payload);
    if (eqErr) {
      return NextResponse.json({ error: `Insert exam_questions failed: ${eqErr.message}` }, { status: 400 });
    }

    return NextResponse.json({ exam_id: exam.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
