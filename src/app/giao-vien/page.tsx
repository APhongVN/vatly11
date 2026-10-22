"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { LogOut, Home, Video, Users, FileText, Plus, Bot, CheckCircle, Trash2 } from "lucide-react";

export default function GiaoVienPage() {
  const [activeTab, setActiveTab] = useState("grading"); // grading, activities, students
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // State cho form
  const [newStudent, setNewStudent] = useState("");
  const [editAct, setEditAct] = useState<any>({ id: "", title: "", video_url: "", description: "" });
  const [gradingId, setGradingId] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: subs } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    const { data: acts } = await supabase.from('activities').select('*').order('id');
    const { data: studs } = await supabase.from('students').select('*').order('full_name');
    if (subs) setSubmissions(subs);
    if (acts) setActivities(acts);
    if (studs) setStudents(studs);
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // --- CHẤM ĐIỂM ---
  const gradeWithAI = async (id: string, answer: string) => {
    setGradingId(id);
    try {
      const res = await fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentAnswer: answer }) });
      const data = await res.json();
      if (data.score !== undefined) {
        await supabase.from('submissions').update({ ai_score: data.score, ai_feedback: data.feedback, status: 'graded' }).eq('id', id);
        fetchData();
      }
    } catch (e) { alert("Lỗi gọi AI!"); }
    setGradingId(null);
  };

  // --- QUẢN LÝ SINH VIÊN ---
  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent) return;
    await supabase.from('students').insert([{ full_name: newStudent }]);
    setNewStudent("");
    fetchData();
  };

  // --- QUẢN LÝ BÀI TẬP ---
  const saveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editAct.id) {
      // Sửa
      await supabase.from('activities').update({ title: editAct.title, video_url: editAct.video_url, description: editAct.description }).eq('id', editAct.id);
    } else {
      // Thêm mới
      await supabase.from('activities').insert([{ title: editAct.title, video_url: editAct.video_url, description: editAct.description }]);
    }
    setEditAct({ id: "", title: "", video_url: "", description: "" });
    fetchData();
  };

  return (
    <main className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-700">Quản trị viên</h1>
          <p className="text-xs text-gray-500 mt-1">Cô Hương Xuân</p>
        </div>
        <div className="flex-1 p-4 space-y-2">
          <Link href="/" className="flex items-center gap-3 p-3 text-gray-600 hover:bg-gray-100 rounded-lg"><Home className="w-5 h-5" /> Về trang chủ</Link>
          <button onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'grading' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><FileText className="w-5 h-5" /> Chấm điểm bài nộp</button>
          <button onClick={() => setActiveTab('activities')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'activities' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><Video className="w-5 h-5" /> Quản lý 14 bài học</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'students' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}><Users className="w-5 h-5" /> Quản lý Sinh viên</button>
        </div>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium"><LogOut className="w-5 h-5" /> Đăng xuất</button>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH */}
      <div className="flex-1 p-8 overflow-y-auto h-screen">
        
        {/* TAB CHẤM ĐIỂM */}
        {activeTab === 'grading' && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-800">Chấm điểm bài nộp</h2>
            <div className="space-y-4">
              {submissions.map(sub => (
                <div key={sub.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between mb-2">
                    <div><span className="font-bold text-lg">{sub.student_name}</span> <span className="text-sm text-gray-500">- Bài tập ID: {sub.activity_id || 'Cũ'}</span></div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{sub.status === 'graded' ? 'Đã chấm' : 'Chờ chấm'}</span>
                  </div>
                  <p className="bg-gray-50 p-3 rounded border text-sm mb-3">{sub.answer}</p>
                  {sub.status === 'graded' ? (
                    <div className="bg-blue-50 p-3 rounded border border-blue-100">
                      <span className="font-semibold text-blue-800">AI chấm: {sub.ai_score}/6 điểm</span>
                      <p className="text-sm text-blue-700 mt-1">{sub.ai_feedback}</p>
                    </div>
                  ) : (
                    <button onClick={() => gradeWithAI(sub.id, sub.answer)} disabled={gradingId === sub.id} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                      <Bot className="w-4 h-4" /> {gradingId === sub.id ? "Đang chấm..." : "Chấm bằng AI"}
                    </button>
                  )}
                </div>
              ))}
              {submissions.length === 0 && <p className="text-gray-500">Chưa có bài nộp nào.</p>}
            </div>
          </div>
        )}

        {/* TAB QUẢN LÝ BÀI TẬP */}
        {activeTab === 'activities' && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-800">Quản lý 14 Bài học</h2>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h3 className="font-semibold mb-3">{editAct.id ? "Sửa bài học" : "Thêm bài học mới"}</h3>
              <form onSubmit={saveActivity} className="grid md:grid-cols-2 gap-3">
                <input value={editAct.title} onChange={e => setEditAct({...editAct, title: e.target.value})} placeholder="Tên bài học" className="p-2 border rounded" required />
                <input value={editAct.video_url} onChange={e => setEditAct({...editAct, video_url: e.target.value})} placeholder="Link Video (Youtube/Drive)" className="p-2 border rounded" />
                <input value={editAct.description} onChange={e => setEditAct({...editAct, description: e.target.value})} placeholder="Mô tả ngắn" className="p-2 border rounded md:col-span-2" />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700 md:col-span-2">Lưu thông tin</button>
              </form>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {activities.map(act => (
                <div key={act.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold">{act.id}. {act.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{act.description}</p>
                    {act.video_url && <p className="text-xs text-blue-500 mt-2 truncate">Video: {act.video_url}</p>}
                  </div>
                  <button onClick={() => setEditAct(act)} className="text-blue-600 text-sm font-medium mt-3 text-left hover:underline">Sửa bài này</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB QUẢN LÝ SINH VIÊN */}
        {activeTab === 'students' && (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-2xl font-bold text-gray-800">Quản lý Sinh viên</h2>
            <form onSubmit={addStudent} className="flex gap-2 max-w-md">
              <input value={newStudent} onChange={e => setNewStudent(e.target.value)} placeholder="Nhập họ tên sinh viên..." className="flex-1 p-2 border rounded-lg" required />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-1"><Plus className="w-4 h-4" /> Thêm</button>
            </form>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-2xl">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="p-4 font-semibold text-gray-600">Họ và tên</th><th className="p-4 font-semibold text-gray-600 text-right">Hành động</th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-4 font-medium">{s.full_name}</td>
                      <td className="p-4 text-right">
                        <button onClick={async () => { if(confirm('Xóa sinh viên này?')) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}