import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authorizeApi } from "@/lib/api-security";
import { GEMINI_MODELS } from "@/lib/gemini-config";

const MODELS = GEMINI_MODELS;

export async function POST(req: Request) {
  const access = await authorizeApi(["teacher"], 10, "quiz");
  if ("response" in access) return access.response;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Dịch vụ tạo câu hỏi AI chưa được cấu hình." }, { status: 503 });
  try {
    const { topic, count = 4, difficulty = "Trung bình" } = await req.json();
    if (!topic || typeof topic !== "string" || topic.length > 500 || !Number.isInteger(count) || count < 1 || count > 20) {
      return NextResponse.json({ error: "Thiếu chủ đề cần tạo câu hỏi" }, { status: 400 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
BẠN LÀ CHUYÊN GIA BIÊN SOẠN ĐỀ THI VẬT LÍ 11 CHUẨN BỘ GIÁO DỤC.
NHIỆM VỤ: Hãy tạo ${count} câu hỏi trắc nghiệm khách quan chất lượng cao về chủ đề: "${topic}".
ĐỘ KHÓ: ${difficulty}.

QUY TẮC BẮT BUỘC:
1. Mỗi câu hỏi gồm 4 phương án A, B, C, D (options là mảng 4 chuỗi).
2. "correct_option" là số nguyên từ 0 đến 3 (tương ứng A=0, B=1, C=2, D=3).
3. "explanation": Lời giải thích chi tiết, sư phạm, chỉ ra công thức vì sao chọn đáp án đó.
4. Mọi công thức Vật lí / Toán học BẮT BUỘC viết dưới dạng LaTeX bọc trong $...$ (ví dụ: $C = \\frac{\\varepsilon S}{9.10^9 \\cdot 4\\pi d}$, $W = \\frac{1}{2}CU^2$, $Q = CU$).

TRẢ VỀ DUY NHẤT 1 MẢNG JSON HỢP LỆ (không thêm markdown ngoài, không thêm văn bản khác):
[
  {
    "question": "Nội dung câu hỏi 1...",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correct_option": 1,
    "explanation": "Giải thích chi tiết có công thức LaTeX..."
  }
]
`;

    let lastError: any = null;
    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.3,
            maxOutputTokens: 2500,
          },
        });

        const text = response.text || "";
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ questions, model });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} quiz generation failed:`, err.message);
        continue;
      }
    }

    return NextResponse.json({
      error: "Không thể sinh câu hỏi bằng AI: " + (lastError?.message || "Vui lòng thử lại")
    }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
