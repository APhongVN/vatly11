import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { 
    timeout: 60000, // Tăng thời gian chờ lên 60 giây
    extraHeaders: { "User-Agent": "tu-dien-web" } 
  }
});

// Hàm hỗ trợ thử lại khi gặp lỗi mạng
async function generateWithRetry(model: string, contents: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent({ model, contents });
    } catch (error: any) {
      if (i === maxRetries - 1) throw error; // Nếu là lần thử cuối thì ném lỗi ra
      console.log(`Thử lại lần ${i + 1} sau lỗi: ${error.message}`);
      await new Promise(res => setTimeout(res, 2000)); // Đợi 2 giây trước khi thử lại
    }
  }
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "Thiếu tin nhắn" }, { status: 400 });

    const response = await generateWithRetry("gemini-3.8-flash", message);
    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error("--- LỖI CHI TIẾT GỌI GEMINI ---", {
      message: error.message,
      cause: error.cause,
    });
    return NextResponse.json({ 
      error: error.message || "Lỗi không xác định",
      details: error.cause ? String(error.cause) : "Không có thông tin bổ sung"
    }, { status: 500 });
  }
}