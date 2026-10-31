import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authorizeApi } from "@/lib/api-security";
import { GEMINI_MODELS } from "@/lib/gemini-config";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 1200;
const MAX_REQUEST_BYTES = 24_000;

const SYSTEM_INSTRUCTION = `Bạn là trợ lý học tập Vật lí 11, tập trung vào tụ điện. Trả lời bằng tiếng Việt, đúng vật lí, rõ ý và ngắn gọn: thường 2–5 câu. Nếu là bài tập, nêu công thức, thay số, đơn vị và kết quả; nếu học sinh đang làm nhiệm vụ chưa nộp, chỉ gợi ý từng bước, không cho đáp án hoàn chỉnh. Viết công thức bằng LaTeX trong $...$. Nếu thiếu dữ kiện hoặc không chắc, nói rõ điều cần bổ sung thay vì đoán. Nội dung chuẩn: C = ε₀εᵣS/d; Q = CU; W = 1/2 CU² = 1/2 QU = Q²/(2C). Khi tụ còn nối nguồn thì U do nguồn giữ ổn định; khi đã ngắt nguồn thì Q được giữ (bỏ qua rò điện). Không khẳng định học liệu chưa được cung cấp là nội dung đã có trên website.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const access = await authorizeApi(["teacher", "student"], 12, "chat");
  if ("response" in access) return access.response;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Trợ lý AI chưa được cấu hình. Em hãy báo giáo viên." }, { status: 503 });
  }

  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Tin nhắn quá dài. Em hãy rút gọn câu hỏi rồi gửi lại nhé." }, { status: 413 });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Tin nhắn quá dài. Em hãy rút gọn câu hỏi rồi gửi lại nhé." }, { status: 413 });
    }

    const parsed = JSON.parse(rawBody) as { messages?: unknown };
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
      return NextResponse.json({ error: "Em hãy nhập câu hỏi trước nhé." }, { status: 400 });
    }

    const messages = parsed.messages
      .slice(-MAX_MESSAGES)
      .map((item): ChatMessage | null => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as { role?: unknown; content?: unknown; text?: unknown };
        const role = candidate.role === "assistant" || candidate.role === "model" || candidate.role === "ai"
          ? "assistant"
          : candidate.role === "user"
            ? "user"
            : null;
        const contentValue = typeof candidate.content === "string"
          ? candidate.content
          : typeof candidate.text === "string"
            ? candidate.text
            : "";
        const content = contentValue.trim().slice(0, MAX_MESSAGE_CHARS);
        return role && content ? { role, content } : null;
      })
      .filter((message): message is ChatMessage => message !== null);

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Em hãy gửi một câu hỏi mới nhé." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    for (const model of GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.25,
            maxOutputTokens: 700,
          },
        });

        const reply = response.text?.trim();
        if (reply) return NextResponse.json({ reply });
      } catch {
        console.error("Gemini chat request failed", { model });
      }
    }

    return NextResponse.json(
      { error: "Trợ lý đang bận một chút. Em thử gửi lại sau nhé." },
      { status: 503 }
    );
  } catch {
    return NextResponse.json({ error: "Không gửi được câu hỏi. Em thử lại nhé." }, { status: 400 });
  }
}
