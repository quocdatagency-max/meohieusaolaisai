import OpenAI from "openai";
import { NextResponse } from "next/server";

type Msg = { role: "user" | "assistant"; text: string };

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY environment variable" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "Body must include messages[]" }, { status: 400 });
    }

    const messages: Msg[] = body.messages;
    const userText = messages
      .filter((m) => m.role === "user")
      .slice(-1)[0]?.text;
    if (!userText) {
      return NextResponse.json({ error: "No user message" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    // Keep it simple: feed a compact conversation
    const transcript = messages
      .slice(-12)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input:
        "Bạn là trợ giảng cho sinh viên ngành Y/Dược. Trả lời ngắn gọn, rõ ràng, ưu tiên gạch đầu dòng khi phù hợp. " +
        "Nếu người học hỏi trắc nghiệm, hãy: (1) chọn đáp án, (2) giải thích vì sao đúng, (3) vì sao các lựa chọn khác sai, (4) mẹo nhớ nhanh.\n\n" +
        transcript,
    });

    return NextResponse.json({ text: response.output_text ?? "" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
