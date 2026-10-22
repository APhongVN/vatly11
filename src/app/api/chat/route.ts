import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const maxDuration = 30; // Cho phép chạy tối đa 30s trên Vercel/Render

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: 'Bạn là trợ lý Vật lí AI dạy bài Tụ điện (Vật lí 11). Hãy trả lời ngắn gọn, thân thiện, gợi mở để học sinh tự tìm ra câu trả lời. Tuyệt đối không đưa ra đáp án trực tiếp ngay lập tức.',
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("Lỗi API Chat:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}