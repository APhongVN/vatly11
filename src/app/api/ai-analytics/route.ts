import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authorizeApi } from "@/lib/api-security";
import { GEMINI_MODELS } from "@/lib/gemini-config";

const MODELS = GEMINI_MODELS;

export async function POST(req: Request) {
  const access = await authorizeApi(["teacher"], 5, "analytics");
  if ("response" in access) return access.response;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Dịch vụ phân tích AI chưa được cấu hình." }, { status: 503 });
  try {
    const { data: submissions, error: submissionsError } = await access.supabase
      .from("submissions")
      .select("activity_id,ai_score,final_score,ai_feedback,ai_weaknesses,status")
      .order("submitted_at", { ascending: false })
      .limit(200);
    if (submissionsError) return NextResponse.json({ error: "Không tải được dữ liệu bài nộp của lớp." }, { status: 500 });
    if (!submissions?.length) {
      return NextResponse.json({
        report: "Chưa có đủ dữ liệu bài nộp để tiến hành phân tích học tập."
      });
    }
    const ai = new GoogleGenAI({ apiKey });

    const sampleData = submissions.slice(0, 30).map((s) => ({
      baiTap: s.activity_id,
      diem: s.final_score ?? s.ai_score,
      nhanXet: s.ai_feedback,
      yeuDiem: s.ai_weaknesses,
    }));

    const prompt = `
BẠN LÀ CHUYÊN GIA SƯ PHẠM VẬT LÍ VÀ PHÂN TÍCH DỮ LIỆU GIÁO DỤC (EDTECH ANALYST).
NHIỆM VỤ: Hãy phân tích tình hình học tập môn Vật lí 11 (Chuyên đề Tụ điện) dựa trên kết quả bài làm của lớp học dưới đây.

DỮ LIỆU BÀI NỘP HỌC SINH:
${JSON.stringify(sampleData, null, 2)}

HÃY ĐÁNH GIÁ VÀ XUẤT RA BÁO CÁO TOÀN DIỆN BẰNG ĐỊNH DẠNG JSON DUY NHẤT (không bọc text ngoài):
{
  "summary": "<1 đoạn 3-4 câu nhận xét tổng quan về mức độ nắm bài của lớp, tỷ lệ bài làm đạt yêu cầu>",
  "topWeaknesses": [
    "<Sai sót/Lỗ hổng 1 hay gặp nhất (ví dụ: nhầm lẫn công thức năng lượng hoặc ghép nối tiếp)>",
    "<Sai sót/Lỗ hổng 2 (ví dụ: quên đổi đơn vị uF, pF sang F)>",
    "<Sai sót/Lỗ hổng 3 (ví dụ: giải thích hiện tượng phóng điện nạp điện chưa chuẩn)>"
  ],
  "flippedClassroomAdvice": "<Lời khuyên cụ thể cho Giáo viên trong tiết học trên lớp sắp tới: nên cho thảo luận câu hỏi nào, thí nghiệm biểu diễn gì để gỡ rối>",
  "remedialAction": "<Kế hoạch hỗ trợ cho các bạn học sinh có điểm dưới 5 hoặc làm bài còn yếu>"
}
`;

    let lastError: any = null;
    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
            maxOutputTokens: 2000,
          },
        });

        const text = response.text || "";
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const report = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ report, model });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} analytics failed:`, err.message);
        continue;
      }
    }

    return NextResponse.json({
      error: "Không thể phân tích dữ liệu AI: " + (lastError?.message || "Vui lòng thử lại sau.")
    }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Không thể phân tích dữ liệu lúc này." }, { status: 500 });
  }
}
