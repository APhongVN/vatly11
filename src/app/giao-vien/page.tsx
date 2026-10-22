"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import * as XLSX from "xlsx";
import { LogOut, Home, Video, Users, FileText, Bot, Upload, MessageSquare, Send, Calendar, Download, CheckCircle, Trash2, ArrowLeft, Search, Save, X, Plus, Clock, Layers, BookOpen } from "lucide-react";

export default function GiaoVienPage() {
  const [activeTab, setActiveTab] = useState("activities"); 
  const [activities, setActivities] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isChatMuted, setIsChatMuted] = useState(false);
  
  // States
  const [newMsg, setNewMsg] = useState("");
  const [rubricText, setRubricText] = useState(""); 
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [newStudentName, setNewStudentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupSize, setGroupSize] = useState(4);
  
  // State tạo Quiz
  const [quizTitle, setQuizTitle] = useState("");
  const [quizActivity, setQuizActivity] = useState(1);
  const [quizTime, setQuizTime] = useState(15);
  const [newQs, setNewQs] = useState([{ question: "", image_url: "", options: ["", "", "", ""], correct_option: 0 }]);

  const fetchData = async () => {
    const { data: acts } = await supabase.from('activities').select('*').order('id');
    const { data: studs } = await supabase.from('students').select('*').order('full_name');
    const { data: subs } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
    const { data: msgs } = await supabase.from('messages').select('*').order('created_at');
    const { data: grps } = await supabase.from('groups').select('*');
    const { data: qzs } = await supabase.from('quizzes').select('*').order('id');
    const { data: setting } = await supabase.from('chat_settings').select('is_muted').eq('id', 1).single();
    
    if (acts) setActivities(acts); if (studs) setStudents(studs); if (subs) setSubmissions(subs); if (msgs) setMessages(msgs);
    if (grps) setGroups(grps); if (qzs) setQuizzes(qzs); if (setting) setIsChatMuted(setting.is_muted);
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  // --- QUẢN LÝ SINH VIÊN (Không tạo tài khoản) ---
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

  const deleteStudent = async (id: string, name: string) => {
    if(confirm(`Xóa sinh viên "${name}"?`)) {
      await supabase.from('students').delete().eq('id', id);
      fetchData();
    }
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
    await supabase.from('activities').update({ title, description: desc, video_url: video, deadline: deadline ? new Date(deadline).toISOString() : null }).eq('id', id);
    alert("Đã lưu thay đổi!"); setExpandedAct(null); fetchData();
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, actId: number) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('videos').upload(fileName, file);
    if (!error) {
      const { data } = await supabase.storage.from('videos').getPublicUrl(fileName);
      await supabase.from('activities').update({ document_url: data.publicUrl }).eq('id', actId);
      alert("Đã upload file đính kèm!"); fetchData();
    }
  };

  // --- QUẢN LÝ NHÓM ---
  const autoGroup = async () => {
    if(!confirm(`Tự động chia nhóm (${groupSize} người/nhóm)?`)) return;
    await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('students').update({ group_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    const numGroups = Math.ceil(students.length / groupSize);
    for (let i = 0; i < numGroups; i++) {
       const { data } = await supabase.from('groups').insert([{ name: `Nhóm ${i + 1}` }]).select();
       if (data) {
         const members = students.slice(i * groupSize, (i + 1) * groupSize);
         for (let m of members) await supabase.from('students').update({ group_id: data[0].id }).eq('id', m.id);
       }
    }
    alert("Đã chia nhóm xong!"); fetchData();
  };

  // --- CHẤM ĐIỂM & CHAT ---
  const gradeWithAI = async (id: string, answer: string) => {
    setGradingId(id);
    const res = await fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentAnswer: answer, rubricText }) });
    const data = await res.json();
    if (data.score !== undefined) { await supabase.from('submissions').update({ ai_score: data.score, ai_feedback: data.feedback, status: data.score === -1 ? 'manual' : 'graded' }).eq('id', id); fetchData(); }
    setGradingId(null);
  };

  const toggleMuteChat = async () => {
    await supabase.from('chat_settings').update({ is_muted: !isChatMuted }).eq('id', 1); fetchData();
  };
  const clearAllChat = async () => {
    if(confirm("Xóa toàn bộ tin nhắn?")) { await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); fetchData(); }
  };
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newMsg) return;
    await supabase.from('messages').insert([{ sender_name: "Cô Hương Xuân", content: newMsg }]);
    setNewMsg(""); fetchData();
  };

  // --- TRẮC NGHIỆM ---
  const createQuiz = async () => {
    if (!quizTitle) return alert("Nhập tên bài trắc nghiệm!");
    const { data } = await supabase.from('quizzes').insert([{ activity_id: quizActivity, title: quizTitle, time_limit: quizTime }]).select();
    if (data) {
       for (let q of newQs) await supabase.from('quiz_questions').insert([{ quiz_id: data[0].id, question: q.question, image_url: q.image_url, options: q.options, correct_option: q.correct_option }]);
       alert("Tạo bài thành công!"); setQuizTitle(""); setNewQs([{ question: "", image_url: "", options: ["", "", "", ""], correct_option: 0 }]); fetchData();
    }
  };

  const getAvatar = (name: string) => name.split(' ').pop()?.charAt(0).toUpperCase() || "?";
  const manualSubs = submissions.filter(s => s.status === 'pending' || s.status === 'manual');
  const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + " - " + new Date(isoString).toLocaleDateString('vi-VN');

  return (
    <main className="min-h-screen flex bg-gray-50">
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-blue-900 to-slate-900 text-white"><h1 className="text-xl font-bold tracking-wider">TEACHER PORTAL</h1></div>
        <div className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('activities')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'activities' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Video className="w-5 h-5" /> Quản lý bài học</button>
          <button onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'grading' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><FileText className="w-5 h-5" /> Chấm điểm</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'students' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Users className="w-5 h-5" /> Sinh viên</button>
          <button onClick={() => setActiveTab('groups')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'groups' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Layers className="w-5 h-5" /> Quản lý Nhóm</button>
          <button onClick={() => setActiveTab('quizzes')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'quizzes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><BookOpen className="w-5 h-5" /> Tạo Trắc nghiệm</button>
          <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><MessageSquare className="w-5 h-5" /> Chat nhóm</button>
        </div>
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link href="/" className="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"><Home className="w-5 h-5" /> Trang giới thiệu</Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:text-white hover:bg-red-500 rounded-xl"><LogOut className="w-5 h-5" /> Đăng xuất</button>
        </div>
      </div>

      <div className="flex-1 p-8 h-screen overflow-y-auto relative">
        <Link href="/" className="absolute top-8 right-8 bg-white text-gray-600 p-3 rounded-full shadow-lg border z-10"><ArrowLeft className="w-5 h-5" /></Link>

        {/* QUẢN LÝ BÀI HỌC */}
        {activeTab === 'activities' && (
          <div className="space-y-6 max-w-5xl">
            <h2 className="text-3xl font-bold">Quản lý 14 Bài học</h2>
            <div className="space-y-3">
              {activities.map(act => (
                <div key={act.id} className={`bg-white rounded-xl shadow-sm border ${expandedAct === act.id ? 'border-blue-400' : ''}`}>
                  <div onClick={() => setExpandedAct(expandedAct === act.id ? null : act.id)} className="p-4 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{act.id}</div><div><h3 className="font-bold text-lg">{act.title}</h3><p className="text-xs text-gray-500">{act.description}</p></div></div>
                    <button className="text-blue-600 font-medium text-sm">{expandedAct === act.id ? "Đóng" : "Chỉnh sửa"}</button>
                  </div>
                  {expandedAct === act.id && (
                    <form onSubmit={(e) => saveActivity(act.id, e)} className="p-5 border-t bg-gray-50 space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <input name="title" defaultValue={act.title} className="p-2 border rounded" required />
                        <input name="desc" defaultValue={act.description || ""} className="p-2 border rounded" />
                        <input name="video" defaultValue={act.video_url || ""} placeholder="Link Video" className="p-2 border rounded" />
                        <input type="datetime-local" name="deadline" defaultValue={act.deadline ? new Date(act.deadline).toISOString().slice(0, 16) : ""} className="p-2 border rounded" />
                      </div>
                      <div className="flex gap-4 items-center">
                        <label className="bg-blue-100 text-blue-700 px-4 py-2 rounded cursor-pointer"><Upload className="w-4 h-4 inline mr-2"/>Tải Tài liệu<input type="file" className="hidden" onChange={(e) => handleUploadFile(e, act.id)} /></label>
                        {act.document_url && <a href={act.document_url} target="_blank" className="text-green-600 underline text-sm">Xem file</a>}
                        <button type="submit" className="ml-auto bg-blue-600 text-white px-4 py-2 rounded"><Save className="w-4 h-4 inline mr-2"/>Lưu</button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHẤM ĐIỂM */}
        {activeTab === 'grading' && (
          <div className="space-y-6 max-w-5xl">
            <h2 className="text-3xl font-bold">Chấm điểm</h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <textarea value={rubricText} onChange={(e) => setRubricText(e.target.value)} className="w-full p-2 border rounded h-24 text-sm" placeholder="Dán ma trận điểm..." />
            </div>
            {manualSubs.map(sub => (
              <div key={sub.id} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col gap-2">
                <span className="font-bold">{sub.student_name} - Bài {sub.activity_id}</span>
                <div className="bg-gray-50 p-3 rounded text-sm">{sub.answer || "Nộp file"}</div>
                <div className="flex gap-2">
                  <button onClick={() => gradeWithAI(sub.id, sub.answer)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm flex gap-2"><Bot className="w-4 h-4"/> AI Chấm</button>
                  <input type="number" placeholder="Điểm" className="border p-2 rounded w-24" id={`score-${sub.id}`} />
                  <input type="text" placeholder="Nhận xét" className="border p-2 rounded flex-1" id={`fb-${sub.id}`} />
                  <button onClick={async () => { await supabase.from('submissions').update({ ai_score: Number((document.getElementById(`score-${sub.id}`) as HTMLInputElement).value), ai_feedback: (document.getElementById(`fb-${sub.id}`) as HTMLInputElement).value, status: 'graded' }).eq('id', sub.id); fetchData(); }} className="bg-green-600 text-white px-4 py-2 rounded"><CheckCircle className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QUẢN LÝ SINH VIÊN (Đã bỏ tạo tài khoản, thêm nút Xóa) */}
        {activeTab === 'students' && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold">Sinh viên ({students.length})</h2>
              <button onClick={deleteAllStudents} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 flex items-center gap-2 shadow-sm"><Trash2 className="w-4 h-4"/> Xóa tất cả</button>
            </div>
            
            <div className="flex gap-4">
              <form onSubmit={addStudentManual} className="flex gap-2 bg-white p-4 rounded-xl shadow-sm border flex-1">
                <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nhập tên SV..." className="flex-1 border p-2 rounded focus:ring-2 outline-none" required />
                <button className="bg-blue-600 text-white px-4 py-2 rounded">Thêm</button>
              </form>
              <div className="bg-white p-4 rounded-xl shadow-sm border flex-1 flex items-center">
                <input type="file" accept=".xlsx" onChange={handleFileUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700" />
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border">
               <div className="relative mb-6">
                 <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                 <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm sinh viên..." className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredStudents.map(s => (
                  <div key={s.id} className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                    <span className="truncate pr-2">{s.full_name}</span>
                    <button onClick={() => deleteStudent(s.id, s.full_name)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
               </div>
            </div>
          </div>
        )}

        {/* QUẢN LÝ NHÓM */}
        {activeTab === 'groups' && (
          <div className="space-y-6 max-w-5xl">
            <h2 className="text-3xl font-bold">Quản lý Nhóm</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border flex gap-4 items-center">
              <input type="number" value={groupSize} onChange={e => setGroupSize(Number(e.target.value))} className="border p-2 rounded w-24" />
              <button onClick={autoGroup} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Chia nhóm tự động</button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {groups.map(g => (
                <div key={g.id} className="bg-white p-4 rounded-xl shadow-sm border">
                  <h4 className="font-bold border-b pb-2 mb-2">{g.name}</h4>
                  <ul>{students.filter(s => s.group_id === g.id).map(s => <li key={s.id} className="text-sm">{s.full_name}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TẠO TRẮC NGHIỆM */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-3xl font-bold">Tạo Bài Trắc nghiệm</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} placeholder="Tên bài trắc nghiệm..." className="w-full border p-2 rounded" />
              <div className="flex gap-4">
                <select value={quizActivity} onChange={e => setQuizActivity(Number(e.target.value))} className="border p-2 rounded flex-1">{activities.map(a => <option key={a.id} value={a.id}>Bài {a.id}</option>)}</select>
                <input type="number" value={quizTime} onChange={e => setQuizTime(Number(e.target.value))} className="border p-2 rounded w-32" />
              </div>
              {newQs.map((q, idx) => (
                <div key={idx} className="border p-4 rounded-lg bg-gray-50 space-y-3">
                  <input value={q.question} onChange={e => { const n = [...newQs]; n[idx].question = e.target.value; setNewQs(n); }} placeholder={`Câu hỏi ${idx + 1}`} className="w-full border p-2 rounded" />
                  <input value={q.image_url} onChange={e => { const n = [...newQs]; n[idx].image_url = e.target.value; setNewQs(n); }} placeholder="Link ảnh (nếu có)" className="w-full border p-2 rounded text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input type="radio" checked={q.correct_option === oIdx} onChange={() => { const n = [...newQs]; n[idx].correct_option = oIdx; setNewQs(n); }} />
                        <input value={opt} onChange={e => { const n = [...newQs]; n[idx].options[oIdx] = e.target.value; setNewQs(n); }} placeholder={`Đáp án ${oIdx + 1}`} className="w-full border p-2 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => setNewQs([...newQs, { question: "", image_url: "", options: ["", "", "", ""], correct_option: 0 }])} className="text-blue-600 font-medium text-sm">+ Thêm câu hỏi</button>
              <button onClick={createQuiz} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold w-full">Lưu Bài</button>
            </div>
          </div>
        )}

        {/* CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border h-[80vh] flex flex-col max-w-4xl mx-auto">
            <div className="p-4 border-b bg-slate-800 text-white flex justify-between">
              <h2 className="font-bold">Kênh thảo luận</h2>
              <div className="flex gap-2">
                <button onClick={toggleMuteChat} className={`px-3 py-1 rounded text-sm ${isChatMuted ? 'bg-green-500' : 'bg-red-500'}`}>{isChatMuted ? "Mở chat" : "Cấm chat"}</button>
                <button onClick={clearAllChat} className="bg-red-700 px-3 py-1 rounded text-sm">Xóa hết</button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.sender_name.includes('Cô') ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${m.sender_name.includes('Cô') ? 'bg-blue-600' : 'bg-emerald-500'}`}>{getAvatar(m.sender_name)}</div>
                   <div className={`p-3 rounded-xl max-w-[70%] text-sm ${m.sender_name.includes('Cô') ? 'bg-blue-100' : 'bg-gray-100'}`}><p className="text-xs font-semibold mb-1 text-gray-500">{m.sender_name} • {formatTime(m.created_at)}</p><p>{m.content}</p></div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 border p-2 rounded-lg" />
              <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg"><Send className="w-5 h-5"/></button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}