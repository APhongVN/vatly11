"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogOut, Bot, CheckCircle, Clock } from "lucide-react";

export default function GiaoVienPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchSubs = async () => {
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (data) setSubs(data);
  };

  useEffect(() => { fetchSubs(); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const gradeWithAI = async (id: string, answer: string) => {
    setGradingId(id);
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentAnswer: answer })
      });
      const data = await res.json();
      
      if (data.score !== undefined) {
        await supabase.from('submissions').update({
          ai_score: data.score,
          ai_feedback: data.feedback,
          status: 'graded'
        }).eq('id', id);
        fetchSubs();
      }
    } catch (e) {
      alert("Lỗi khi gọi AI!");
    }
    setGradingId(null);
  };

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Giáo viên</h1>
          <button onClick={handleLogout} className="btn btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200">
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Danh sách bài nộp ({submissions.length})</h2>
          <div className="space-y-4">
            {submissions.length === 0 && <p className="text-gray-500">Chưa có sinh viên nào nộp bài.</p>}
            {submissions.map((sub) => (
              <div key={sub.id} className="border rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{sub.student_name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(sub.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {sub.status === 'graded' ? 'Đã chấm' : 'Chờ chấm'}
                  </span>
                </div>
                
                <div className="bg-white p-3 rounded-lg border text-sm text-gray-700">
                  {sub.answer}
                </div>

                {sub.status === 'graded' ? (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-800">AI Đã chấm: {sub.ai_score}/6 điểm</span>
                    </div>
                    <p className="text-sm text-blue-700">{sub.ai_feedback}</p>
                  </div>
                ) : (
                  <button 
                    onClick={() => gradeWithAI(sub.id, sub.answer)}
                    disabled={gradingId === sub.id}
                    className="btn btn-primary w-full md:w-auto self-end"
                  >
                    <Bot className="w-4 h-4" /> 
                    {gradingId === sub.id ? "AI đang đọc bài..." : "Chấm điểm bằng AI"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}