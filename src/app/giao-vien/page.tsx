"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import * as XLSX from "xlsx";
import { LogOut, Home, Video, Users, FileText, Bot, Upload, MessageSquare, Send, Calendar, Download, CheckCircle, Trash2 } from "lucide-react";

export default function GiaoVienPage() {
  const [activeTab, setActiveTab] = useState("activities"); 
  const [activities, setActivities] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  const [newMsg, setNewMsg] = useState("");
  const [rubricText, setRubricText] = useState(""); 
  const [gradingId, setGradingId] = useState<string | null>(null);

  const fetchData = async () => {
    const { data: acts } = await supabase.from('activities').select('*').order('id');
    const { data: studs } = await supabase.from('students').select('*').order('full_name');
    const { data: subs } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
    const { data: msgs } = await supabase.from('messages').select('*').order('created_at');
    if (acts) setActivities(acts); if (studs) setStudents(studs); if (subs) setSubmissions(subs); if (msgs) setMessages(msgs);
  };

  useEffect(() => { 
    fetchData(); 
    // Chat Polling mỗi 3 giây
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  // IMPORT EXCEL SINH VIÊN (Cho phép trùng, báo cáo kết quả)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let names: string[] = [];
      data.forEach(row => {
        const val = row.find((cell: any) => typeof cell === 'string' && cell.trim().length > 3 && !cell.includes('STT') && !cell.includes('Tên'));
        if (val) names.push(val.trim());
      });
      if (names.length === 0) { alert("Không tìm thấy tên sinh viên nào trong file!"); return; }
      
      names.sort((a, b) => (a.split(' ').pop() || "").localeCompare(b.split(' ').pop() || ""));
      const inserts = names.map(n => ({ full_name: n, class_name: "11A1" }));
      const { error } = await supabase.from('students').insert(inserts);
      
      if (error) alert("Lỗi import: " + error.message);
      else { alert(`Đã import thành công ${names.length} sinh viên!`); fetchData(); }
    };
    reader.readAsBinaryString(file);
  };

  const deleteAllStudents = async () => {
    if(confirm("CẢNH BÁO: Bạn có chắc muốn xóa TẤT CẢ sinh viên? Hành động này không thể hoàn tác!")) {
       await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Xóa tất cả
       fetchData(); alert("Đã xóa toàn bộ sinh viên!");
    }
  };

  const saveActivity = async (id: number, updates: any) => {
    await supabase.from('activities').update(updates).eq('id', id); fetchData();
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, actId: number) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('videos').upload(fileName, file);
    if (!error) {
      const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
      await saveActivity(actId, { document_url: data.publicUrl }); alert("Đã upload tài liệu!");
    }
  };

  const gradeWithAI = async (id: string, answer: string) => {
    setGradingId(id);
    const res = await fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentAnswer: answer, rubricText }) });
    const data = await res.json();
    if (data.score !== undefined) { await supabase.from('submissions').update({ ai_score: data.score, ai_feedback: data.feedback, status: data.score === -1 ? 'manual' : 'graded' }).eq('id', id); fetchData(); }
    setGradingId(null);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newMsg) return;
    await supabase.from('messages').insert([{ sender_name: "Cô Hương Xuân", content: newMsg }]);
    setNewMsg(""); fetchData();
  };

  const getAvatar = (name: string) => name.split(' ').pop()?.charAt(0).toUpperCase() || "?";
  const manualSubs = submissions.filter(s => s.status === 'pending' || s.status === 'manual');

  return (
    <main className="min-h-screen flex bg-gray-100">
      <div className="w-64 bg-white border-r flex flex-col shadow-sm">
        <div className="p-6 border-b bg-blue-600 text-white"><h1 className="text-xl font-bold">Quản trị viên</h1></div>
        <div className="flex-1 p-4 space-y-2">
          <Link href="/" className="flex items-center gap-3 p-3 text-gray-600 hover:bg-gray-100 rounded-lg"><Home className="w-5 h-5" /> Trang giới thiệu</Link>
          <button onClick={() => setActiveTab('activities')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'activities' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600'}`}><Video className="w-5 h-5" /> Quản lý bài học</button>
          <button onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'grading' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600'}`}><FileText className="w-5 h-5" /> Chấm điểm</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'students' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600'}`}><Users className="w-5 h-5" /> Sinh viên</button>
          <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${activeTab === 'chat' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600'}`}><MessageSquare className="w-5 h-5" /> Chat nhóm</button>
        </div>
        <button onClick={handleLogout} className="m-4 p-3 text-red-600 bg-red-50 rounded-lg font-medium flex justify-center gap-2"><LogOut className="w-5 h-5" /> Đăng xuất</button>
      </div>

      <div className="flex-1 p-8 h-screen overflow-y-auto">
        {activeTab === 'activities' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Quản lý 14 Bài học</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {activities.map(act => (
                <div key={act.id} className="bg-white p-5 rounded-xl shadow-sm border">
                  <h3 className="font-bold text-lg mb-2">{act.id}. {act.title}</h3>
                  <div className="space-y-3 text-sm">
                    <input type="text" defaultValue={act.video_url || ""} placeholder="Link Video" className="w-full p-2 border rounded" onBlur={(e) => saveActivity(act.id, { video_url: e.target.value })} />
                    <div className="flex gap-2 items-center">
                      <label className="bg-gray-100 px-3 py-2 rounded cursor-pointer hover:bg-gray-200 flex-1 text-center border"><Upload className="w-4 h-4 inline mr-2"/>Tải lên Tài liệu</label>
                      <input type="file" className="hidden" onChange={(e) => handleUploadDoc(e, act.id)} />
                    </div>
                    {act.document_url && <span className="text-green-600 block truncate">Đã đính kèm</span>}
                    <div className="flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-gray-500"/>
                       <input type="datetime-local" defaultValue={act.deadline ? new Date(act.deadline).toISOString().slice(0, 16) : ""} className="p-2 border rounded w-full" onChange={(e) => saveActivity(act.id, { deadline: new Date(e.target.value).toISOString() })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'grading' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Chấm điểm</h2>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <label className="font-semibold block mb-2">Ma trận điểm:</label>
              <textarea value={rubricText} onChange={(e) => setRubricText(e.target.value)} className="w-full p-2 border rounded h-24 text-sm" placeholder="Ví dụ: 1đ nếu có từ 'điện dung'..." />
            </div>
            <div className="space-y-4">
              {manualSubs.map(sub => (
                <div key={sub.id} className="bg-white p-4 rounded-xl shadow-sm border bg-orange-50/30">
                  <div className="flex justify-between items-center mb-2"><span className="font-bold">{sub.student_name} - Bài {sub.activity_id}</span></div>
                  <div className="bg-white p-3 rounded text-sm border mb-2">{sub.answer || "Nộp file đính kèm"}</div>
                  {sub.file_url && <a href={sub.file_url} target="_blank" className="text-blue-600 text-sm underline">Xem file</a>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => gradeWithAI(sub.id, sub.answer)} disabled={gradingId === sub.id} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex gap-2 items-center"><Bot className="w-4 h-4"/> {gradingId === sub.id ? "Đang chấm..." : "Chấm AI"}</button>
                    <input type="number" placeholder="Điểm" className="border p-2 rounded-lg w-24 text-sm" id={`score-${sub.id}`} />
                    <input type="text" placeholder="Nhận xét" className="border p-2 rounded-lg flex-1 text-sm" id={`fb-${sub.id}`} />
                    <button onClick={async () => { await supabase.from('submissions').update({ ai_score: Number((document.getElementById(`score-${sub.id}`) as HTMLInputElement).value), ai_feedback: (document.getElementById(`fb-${sub.id}`) as HTMLInputElement).value, status: 'graded' }).eq('id', sub.id); fetchData(); }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Lưu</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Danh sách Sinh viên ({students.length})</h2>
              <button onClick={deleteAllStudents} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 flex items-center gap-2"><Trash2 className="w-4 h-4"/> Xóa tất cả</button>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <label className="block font-semibold mb-2">Import từ Excel:</label>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {students.map(s => (
                <div key={s.id} className="bg-white border px-3 py-2 rounded-lg text-sm font-medium shadow-sm flex justify-between items-center group">
                  {s.full_name}
                  <button onClick={async () => { if(confirm(`Xóa ${s.full_name}?`)) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border h-[80vh] flex flex-col">
            <div className="p-4 border-b bg-gray-50 rounded-t-xl font-bold">Kênh thảo luận lớp</div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.sender_name.includes('Cô') ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${m.sender_name.includes('Cô') ? 'bg-blue-600' : 'bg-emerald-500'}`}>{getAvatar(m.sender_name)}</div>
                   <div className={`p-3 rounded-xl max-w-[70%] text-sm ${m.sender_name.includes('Cô') ? 'bg-blue-100' : 'bg-gray-100'}`}><p className="text-xs font-semibold mb-1 text-gray-500">{m.sender_name}</p><p>{m.content}</p></div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 border p-2 rounded-lg bg-gray-50" />
              <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg"><Send className="w-5 h-5"/></button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}