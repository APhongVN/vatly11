"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import * as XLSX from "xlsx";
import { LogOut, Home, Video, Users, FileText, Bot, Upload, MessageSquare, Send, Calendar, Download, CheckCircle, Trash2, ArrowLeft, Search, Save, X, Plus, Clock } from "lucide-react";

export default function GiaoVienPage() {
  const [activeTab, setActiveTab] = useState("activities"); 
  const [activities, setActivities] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  // States
  const [newMsg, setNewMsg] = useState("");
  const [rubricText, setRubricText] = useState(""); 
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  
  // State quản lý sinh viên
  const [newStudentName, setNewStudentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    const { data: acts } = await supabase.from('activities').select('*').order('id');
    const { data: studs } = await supabase.from('students').select('*').order('full_name');
    const { data: subs } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
    const { data: msgs } = await supabase.from('messages').select('*').order('created_at');
    if (acts) setActivities(acts); if (studs) setStudents(studs); if (subs) setSubmissions(subs); if (msgs) setMessages(msgs);
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  // --- QUẢN LÝ SINH VIÊN ---
  const addStudentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    await supabase.from('students').insert([{ full_name: newStudentName.trim(), class_name: "11A1" }]);
    setNewStudentName(""); fetchData();
  };

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
      names.sort((a, b) => (a.split(' ').pop() || "").localeCompare(b.split(' ').pop() || ""));
      const inserts = names.map(n => ({ full_name: n, class_name: "11A1" }));
      const { error } = await supabase.from('students').insert(inserts);
      if (error) alert("Lỗi import: " + error.message);
      else { alert(`Đã import thành công ${names.length} sinh viên!`); fetchData(); }
    };
    reader.readAsBinaryString(file);
  };

  const deleteAllStudents = async () => {
    if(confirm("CẢNH BÁO: Xóa TẤT CẢ sinh viên?")) {
       await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
       fetchData();
    }
  };

  // --- QUẢN LÝ BÀI HỌC ---
  const saveActivity = async (id: number, e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const desc = (form.elements.namedItem('desc') as HTMLInputElement).value;
    const video = (form.elements.namedItem('video') as HTMLInputElement).value;
    const deadline = (form.elements.namedItem('deadline') as HTMLInputElement).value;
    
    await supabase.from('activities').update({ 
      title, description: desc, video_url: video, 
      deadline: deadline ? new Date(deadline).toISOString() : null 
    }).eq('id', id);
    
    alert("Đã lưu thay đổi!"); setExpandedAct(null); fetchData();
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, actId: number) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('videos').upload(fileName, file);
    if (!error) {
      const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
      await supabase.from('activities').update({ document_url: data.publicUrl }).eq('id', actId);
      alert("Đã upload file đính kèm!"); fetchData();
    }
  };

  // --- CHẤM ĐIỂM ---
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
  const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + " - " + d.toLocaleDateString('vi-VN');
  };

  return (
    <main className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR ĐEN SANG TRỌNG */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-blue-900 to-slate-900 text-white">
          <h1 className="text-xl font-bold tracking-wider">TEACHER PORTAL</h1>
          <p className="text-xs text-blue-300 mt-1">Cô Hương Xuân</p>
        </div>
        <div className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('activities')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${activeTab === 'activities' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50 translate-x-1' : 'hover:bg-slate-800 hover:text-white'}`}><Video className="w-5 h-5" /> Quản lý bài học</button>
          <button onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${activeTab === 'grading' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50 translate-x-1' : 'hover:bg-slate-800 hover:text-white'}`}><FileText className="w-5 h-5" /> Chấm điểm</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${activeTab === 'students' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50 translate-x-1' : 'hover:bg-slate-800 hover:text-white'}`}><Users className="w-5 h-5" /> Sinh viên</button>
          <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50 translate-x-1' : 'hover:bg-slate-800 hover:text-white'}`}><MessageSquare className="w-5 h-5" /> Chat nhóm</button>
        </div>
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link href="/" className="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"><Home className="w-5 h-5" /> Trang giới thiệu</Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-colors"><LogOut className="w-5 h-5" /> Đăng xuất</button>
        </div>
      </div>

      <div className="flex-1 p-8 h-screen overflow-y-auto relative">
        {/* NÚT QUAY LẠI GÓC PHẢI */}
        <Link href="/" className="absolute top-8 right-8 bg-white text-gray-600 hover:text-blue-600 p-3 rounded-full shadow-lg border border-gray-100 transition-all hover:scale-110 flex items-center justify-center z-10" title="Quay lại trang chủ">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* TAB BÀI HỌC (ACCORDION) */}
        {activeTab === 'activities' && (
          <div className="space-y-6 max-w-5xl animate-slide-up">
            <h2 className="text-3xl font-bold text-gray-800">Quản lý 14 Bài học</h2>
            <div className="space-y-3">
              {activities.map(act => (
                <div key={act.id} className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${expandedAct === act.id ? 'border-blue-400 shadow-md ring-1 ring-blue-100' : 'border-gray-200 hover:border-blue-200'}`}>
                  {/* Thanh Hàng Ngang */}
                  <div onClick={() => setExpandedAct(expandedAct === act.id ? null : act.id)} className="p-4 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{act.id}</div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{act.title}</h3>
                        <p className="text-xs text-gray-500">{act.description || "Chưa có mô tả"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       {act.deadline && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">Có Deadline</span>}
                       <button className="text-blue-600 font-medium text-sm hover:underline">{expandedAct === act.id ? "Đóng" : "Chỉnh sửa"}</button>
                    </div>
                  </div>
                  
                  {/* Form Xổ Xuống */}
                  {expandedAct === act.id && (
                    <form onSubmit={(e) => saveActivity(act.id, e)} className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-4 animate-slide-up">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold">Tiêu đề bài</label>
                          <input name="title" defaultValue={act.title} className="w-full p-2 border rounded-lg mt-1" required />
                        </div>
                        <div>
                          <label className="text-sm font-semibold">Mô tả ngắn</label>
                          <input name="desc" defaultValue={act.description || ""} className="w-full p-2 border rounded-lg mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold flex items-center gap-1"><Video className="w-4 h-4"/> Link Video (Youtube)</label>
                          <input name="video" defaultValue={act.video_url || ""} placeholder="https://youtube.com/..." className="w-full p-2 border rounded-lg mt-1" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold flex items-center gap-1"><Calendar className="w-4 h-4"/> Hạn chót nộp</label>
                          <input type="datetime-local" name="deadline" defaultValue={act.deadline ? new Date(act.deadline).toISOString().slice(0, 16) : ""} className="w-full p-2 border rounded-lg mt-1" />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 pt-2">
                        <label className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-200 flex items-center gap-2 font-medium">
                          <Upload className="w-4 h-4"/> Tải lên Tài liệu (Ảnh/PDF/Word)
                          <input type="file" className="hidden" onChange={(e) => handleUploadFile(e, act.id)} />
                        </label>
                        {act.document_url && <a href={act.document_url} target="_blank" className="text-sm text-green-600 underline">Đã đính kèm file - Bấm để xem</a>}
                        
                        <button type="submit" className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4"/> LƯU THAY ĐỔI</button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CHẤM ĐIỂM */}
        {activeTab === 'grading' && (
          <div className="space-y-6 max-w-5xl animate-slide-up">
            <h2 className="text-3xl font-bold text-gray-800">Chấm điểm bài nộp</h2>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <label className="font-bold text-gray-700 block mb-3">1. Cài đặt Ma trận điểm (Rubric)</label>
              <div className="flex gap-4">
                <textarea value={rubricText} onChange={(e) => setRubricText(e.target.value)} className="w-full p-3 border rounded-xl h-28 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Dán các từ khóa chấm điểm vào đây..." />
                <label className="w-48 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors text-gray-500">
                  <Upload className="w-6 h-6 mb-2"/>
                  <span className="text-xs font-medium text-center px-2">Tải file Word/PDF chứa ma trận</span>
                  <input type="file" className="hidden" onChange={(e) => alert("Tính năng đọc file Word/PDF đang phát triển. Vui lòng copy nội dung vào ô bên trái!")} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg text-orange-600">Cần chấm tay ({manualSubs.length})</h3>
              {manualSubs.map(sub => (
                <div key={sub.id} className="bg-white p-5 rounded-xl shadow-sm border border-orange-100 bg-orange-50/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg text-gray-800">{sub.student_name} - Bài {sub.activity_id}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Nộp lúc: {formatTime(sub.submitted_at)}</span>
                  </div>
                  <div className="bg-white p-4 rounded-lg text-sm border mb-3 shadow-sm">{sub.answer || "Nộp file đính kèm"}</div>
                  {sub.file_url && <a href={sub.file_url} target="_blank" className="text-blue-600 text-sm underline mb-3 block">Bấm để xem file bài làm</a>}
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={() => gradeWithAI(sub.id, sub.answer)} disabled={gradingId === sub.id} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex gap-2 items-center hover:bg-indigo-700"><Bot className="w-4 h-4"/> {gradingId === sub.id ? "Đang phân tích..." : "AI Chấm tự luận"}</button>
                    <div className="w-px h-8 bg-gray-300 mx-2"></div>
                    <input type="number" placeholder="Điểm" className="border p-2 rounded-lg w-24 text-sm focus:ring-2" id={`score-${sub.id}`} />
                    <input type="text" placeholder="Nhận xét thủ công..." className="border p-2 rounded-lg flex-1 text-sm focus:ring-2" id={`fb-${sub.id}`} />
                    <button onClick={async () => { await supabase.from('submissions').update({ ai_score: Number((document.getElementById(`score-${sub.id}`) as HTMLInputElement).value), ai_feedback: (document.getElementById(`fb-${sub.id}`) as HTMLInputElement).value, status: 'graded' }).eq('id', sub.id); fetchData(); }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-700"><CheckCircle className="w-4 h-4"/> Lưu</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB SINH VIÊN */}
        {activeTab === 'students' && (
          <div className="space-y-6 max-w-5xl animate-slide-up">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-800">Quản lý Sinh viên ({students.length})</h2>
              <button onClick={deleteAllStudents} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 flex items-center gap-2 shadow-sm"><Trash2 className="w-4 h-4"/> Xóa tất cả</button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border flex flex-col justify-center">
                <form onSubmit={addStudentManual} className="flex gap-2">
                  <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nhập họ tên SV mới..." className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-1"><Plus className="w-5 h-5"/> Thêm</button>
                </form>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border flex flex-col justify-center">
                <label className="block font-bold mb-2 text-gray-700">Import từ file Excel</label>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="block w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border">
               <div className="relative mb-6">
                 <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                 <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm sinh viên theo tên..." className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredStudents.map(s => (
                  <div key={s.id} className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                    <span className="truncate pr-2">{s.full_name}</span>
                    <button onClick={async () => { if(confirm(`Xóa ${s.full_name}?`)) { await supabase.from('students').delete().eq('id', s.id); fetchData(); } }} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                  </div>
                ))}
                {filteredStudents.length === 0 && <p className="text-gray-500 col-span-4 text-center py-4">Không tìm thấy sinh viên nào.</p>}
               </div>
            </div>
          </div>
        )}

        {/* TAB CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl shadow-xl border h-[80vh] flex flex-col max-w-4xl mx-auto overflow-hidden animate-slide-up">
            <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-md z-10">
              <h2 className="font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5"/> Kênh thảo luận lớp 11A1</h2>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.sender_name.includes('Cô') ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${m.sender_name.includes('Cô') ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>{getAvatar(m.sender_name)}</div>
                   <div className={`flex flex-col ${m.sender_name.includes('Cô') ? 'items-end' : 'items-start'}`}>
                     <div className={`p-3 rounded-2xl max-w-[300px] md:max-w-md text-sm shadow-sm ${m.sender_name.includes('Cô') ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm'}`}><p>{m.content}</p></div>
                     <span className="text-[10px] text-gray-400 mt-1 px-1">{m.sender_name} • {formatTime(m.created_at)}</span>
                   </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập tin nhắn trả lời sinh viên..." className="flex-1 border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 shadow-md"><Send className="w-5 h-5"/></button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}