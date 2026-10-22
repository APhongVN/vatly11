"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NopBaiPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.from('students').select('*').then(({ data }) => { if (data) setStudents(data); });
    supabase.from('activities').select('*').order('id').then(({ data }) => { if (data) setActivities(data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('submissions').insert([{ 
      student_name: selectedStudent, 
      activity_id: parseInt(selectedActivity),
      answer: answer 
    }]);
    if (!error) setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">Nộp bài thành công!</h2>
          <p className="text-gray-600">Cô giáo sẽ chấm điểm và gửi phản hồi sớm nhất.</p>
          <button onClick={() => { setSuccess(false); setAnswer(""); }} className="w-full bg-gray-100 py-2 rounded-lg font-medium hover:bg-gray-200">Nộp bài khác</button>
          <Link href="/" className="block text-blue-600 text-sm hover:underline">Về trang chủ</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full space-y-6 relative">
        <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Trang chủ
        </Link>

        <div className="text-center mt-4">
          <h1 className="text-2xl font-bold text-blue-700">Nộp bài tự luận</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Chọn tên của em</label>
              <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white" required>
                <option value="">-- Chọn tên --</option>
                {students.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Chọn bài tập</label>
              <select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} className="w-full mt-1 p-2 border rounded-lg bg-white" required>
                <option value="">-- Chọn bài --</option>
                {activities.map(a => <option key={a.id} value={a.id}>{a.id}. {a.title}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Bài làm</label>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="w-full mt-1 p-3 border rounded-lg h-32 resize-none" placeholder="Viết bài giải của em ở đây..." required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700">
            {loading ? "Đang gửi..." : "Nộp bài"}
          </button>
        </form>
      </div>
    </main>
  );
}