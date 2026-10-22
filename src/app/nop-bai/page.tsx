"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Send, CheckCircle2 } from "lucide-react";

export default function NopBaiPage() {
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('submissions').insert([{ student_name: name, answer: answer }]);
    if (!error) setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card text-center py-12 max-w-md w-full space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">Nộp bài thành công!</h2>
          <p className="text-gray-600">Cô giáo sẽ chấm điểm và gửi phản hồi cho em sớm nhất.</p>
          <button onClick={() => { setSuccess(false); setName(""); setAnswer(""); }} className="btn btn-secondary w-full">Nộp bài khác</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10 flex justify-center items-center">
      <div className="card max-w-2xl w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Nộp bài tự luận</h1>
          <p className="text-gray-500">Giải thích hiện tượng đèn LED sáng lên sau khi ngắt nguồn tụ điện.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Họ và tên</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" placeholder="Nguyễn Văn A" required />
          </div>
          <div>
            <label className="text-sm font-medium">Bài làm</label>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="input mt-1 h-40 resize-none" placeholder="Viết bài giải của em ở đây..." required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            <Send className="w-4 h-4" /> {loading ? "Đang gửi..." : "Nộp bài"}
          </button>
        </form>
      </div>
    </main>
  );
}