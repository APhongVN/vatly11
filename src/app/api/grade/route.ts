import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { studentAnswer } = await req.json();
    if (!studentAnswer) return NextResponse.json({ error: "Thiếu câu trả lời" }, { status: 400 });

    const prompt = `Bạn là giáo viên Vật lý chấm bài tự luận. Hãy chấm điểm câu trả lời của học sinh về hiện tượng tụ điện phóng điện qua LED.
Rubric (thang điểm 0-2 cho mỗi tiêu chí, tổng tối đa 6):
1. Liên hệ hiện tượng (0: không liên hệ, 1: nhắc đến nạp/ngắt nguồn nhưng chưa logic, 2: lập luận từ chuỗi nạp -> ngắt nguồn -> đèn sáng).
2. Ý tưởng tích trữ (0: không đề cập, 1: nêu "có điện còn lại" mơ hồ, 2: nhận ra tụ đã lưu trữ năng lượng trước đó).
3. Diễn đạt khoa học (0: có lỗi bản chất, 1: có lỗi nhỏ, 2: diễn đạt phù hợp).
Hãy trả về ĐÚNG định dạng JSON sau: {"score": [tổng điểm 0-6], "feedback": "[nhận xét chi tiết bằng tiếng Việt]"}.
Câu trả lời của học sinh: "${studentAnswer}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    const responseText = response.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, feedback: "Lỗi định dạng AI." };

    return NextResponse.json(parsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}