import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1].content;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: latestMessage,
      config: { 
        systemInstruction: `Bạn là trợ lý Vật lí AI xuất sắc. Hãy trả lời ngắn gọn, đi thẳng vào vấn đề.
        ĐẶC BIỆT: Mọi công thức Toán học, Vật lý phải được viết dưới dạng LaTeX và bao bọc bởi dấu $...$ (ví dụ: $C = \\frac{\\varepsilon_0 \\varepsilon_r S}{d}$). Không dùng ký tự thường để viết phân số.` 
      }
    });

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    return NextResponse.json({ reply: "Lỗi: " + error.message }, { status: 500 });
  }
}