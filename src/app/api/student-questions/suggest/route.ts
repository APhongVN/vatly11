import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODELS } from "@/lib/gemini-config";

const MAX_REQUEST_BYTES = 4_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * 4.7 Góc hỏi đáp — hỗ trợ AI (tuỳ chọn).
 * Chỉ giáo viên gọi route này để đề xuất câu trả lời dựa trên học liệu đã duyệt.
 * AI chỉ gợi ý; giáo viên phải kiểm tra, chỉnh sửa trước khi gửi phản hồi chính thức.
 */
export async function POST(request: Request) {
  const access = await authorizeApi(["teacher"], 10, "chat");
  if ("response" in access) return access.response;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Trợ lý AI chưa được cấu hình." }, { status: 503 });

  try {
    const body: unknown = JSON.parse(await readBoundedRequestText(request, MAX_REQUEST_BYTES));
    if (!isRecord(body) || typeof body.question !== "string" || body.question.trim().length < 5) {
      return NextResponse.json({ error: "Câu hỏi không hợp lệ." }, { status: 400 });
    }
    const topic = typeof body.topic === "string" ? body.topic : "";
    const prompt = `Bạn là trợ lý sư phạm môn Vật lí 11 về chuyên đề Tụ điện. Hãy đề xuất một câu trả lời ngắn gọn (tối đa 400 ký tự) cho câu hỏi của học sinh dưới đây, dựa trên nội dung học liệu đã duyệt (cấu tạo, tích điện, phóng điện, điện dung, năng lượng, ứng dụng). Chỉ dùng kiến thức chắc chắn; nếu câu hỏi ngoài phạm vi hoặc chưa đủ cơ sở, hãy nói rõ cần giáo viên xem xét thay vì đưa thông tin không chắc chắn. Không trích dẫn tên học sinh.\n\nChủ đề: ${topic || "Tụ điện"}\nCâu hỏi: ${body.question}`;

    const ai = new GoogleGenAI({ apiKey });
    let lastError: unknown = null;
    for (const model of GEMINI_MODELS) {
      try {
        const result = await ai.models.generateContent({ model, contents: prompt });
        const text = result.text?.trim();
        if (text) return NextResponse.json({ suggestion: text, model, disclaimer: "Gợi ý của AI — giáo viên cần kiểm tra và chỉnh sửa trước khi gửi phản hồi chính thức." }, { headers: { "Cache-Control": "no-store, max-age=0" } });
      } catch (error) {
        lastError = error;
      }
    }
    console.error("Không đề xuất được câu trả lời AI", { code: (lastError as { code?: string })?.code || "unknown" });
    return NextResponse.json({ error: "Không đề xuất được câu trả lời lúc này." }, { status: 503 });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json({ error: tooLarge ? "Yêu cầu vượt quá dung lượng." : "Không đề xuất được câu trả lời." }, { status: tooLarge ? 413 : 400 });
  }
}
