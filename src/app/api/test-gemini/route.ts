import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json({ 
        status: "LỖI", 
        message: "Không tìm thấy GEMINI_API_KEY trong file .env.local. Hãy chắc chắn bạn đã tạo file này." 
      });
    }

    const genAI = new GoogleGenerativeAI(key);
    
    // Thử với model ổn định nhất
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Xin chào, hãy trả lời đúng 1 từ: OK");
    
    return NextResponse.json({ 
      status: "THÀNH CÔNG", 
      message: "Key hoạt động tốt!",
      ai_reply: result.response.text()
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: "LỖI TỪ GOOGLE", 
      message: error.message 
    });
  }
}