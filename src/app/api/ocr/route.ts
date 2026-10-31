import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authorizeApi } from "@/lib/api-security";
import { GEMINI_MODELS } from "@/lib/gemini-config";

const MODELS = GEMINI_MODELS;

export async function POST(req: Request) {
  const access = await authorizeApi(["teacher", "student"], 10, "ocr");
  if ("response" in access) return access.response;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Dịch vụ OCR chưa được cấu hình." }, { status: 503 });
  try {
    if (Number(req.headers.get("content-length") || 0) > 12_500_000) {
      return NextResponse.json({ error: "Ảnh vượt quá dung lượng cho phép (tối đa khoảng 8 MB)." }, { status: 413 });
    }
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > 12_500_000) {
      return NextResponse.json({ error: "Ảnh vượt quá dung lượng cho phép (tối đa khoảng 8 MB)." }, { status: 413 });
    }
    const payload = JSON.parse(rawBody);
    const imageData = payload?.imageData;
    const mimeType = payload?.mimeType;
    if (typeof imageData !== "string" || imageData.length > 12_000_000 || !/^image\/(jpeg|png|webp)$/.test(mimeType || "image/jpeg")) {
      return NextResponse.json({ error: "Thiếu dữ liệu ảnh" }, { status: 400 });
    }

    const cleanBase64 = imageData.replace(/^data:image\/\w+;base64,/, "");
    const ai = new GoogleGenAI({ apiKey });

    const ocrPrompt = `Bạn là chuyên gia nhận diện chữ viết tay và bài thi môn Vật lí.
Hãy trích xuất toàn bộ văn bản từ bức ảnh bài làm này.
Quy tắc:
1. Giữ nguyên toàn bộ cấu trúc các câu, các bước giải, lời giải chi tiết của học sinh.
2. Mọi công thức Toán học, Vật lí viết dưới dạng LaTeX chuẩn được bao bọc bởi dấu $...$ hoặc $$...$$.
3. Không thêm thắt lời bình phẩm, chỉ trả về văn bản bài làm trích xuất được.
4. Nếu ảnh quá mờ hoặc không có chữ, hãy ghi chú rõ '[Ảnh không thể đọc được nội dung]'.`;

    let lastError: any = null;
    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType || "image/jpeg",
                  },
                },
                { text: ocrPrompt },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        });

        const text = response.text || "";
        if (text) {
          return NextResponse.json({ text, model });
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`OCR model ${model} error:`, error.message);
        continue;
      }
    }

    return NextResponse.json({ error: lastError?.message || "Không thể kết nối AI trích xuất ảnh", text: "" }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, text: "" }, { status: 500 });
  }
}
