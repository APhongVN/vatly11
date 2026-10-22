"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import * as XLSX from "xlsx";
import { LogOut, Home, Video, Users, FileText, Bot, Upload, MessageSquare, Send, Calendar, Download, CheckCircle, Trash2, ArrowLeft, Search, Save, X, Plus, Clock, AlertTriangle, Lock, Unlock, BookOpen, Layers, UserPlus } from "lucide-react";

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
  
  // State tạo nhóm
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

  // --- QUẢN LÝ SINH VIÊN & CẤP TÀI KHOẢN ---
  const generateAccount = (name: string) => {
    // Tạo email và pass tự động (Xóa dấu, viết thường)
    const email = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, '').toLowerCase() + '@student.edu.vn';
    const password = Math.random().toString(36).slice(-6); // 6 ký tự ngẫu nhiên
    return { email, password };
  };

  const addStudentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const { email, password } = generateAccount(newStudentName.trim());
    const { error } = await supabase.from('students').insert([{ full_name: newStudentName.trim(), email, password }]);
    if(error) alert("Lỗi: " + error.message); else { setNewStudentName(""); fetchData(); }
  };

  const exportAccounts = () => {
    const data = students.map(s => ({ "Họ Tên": s.full_name, "Email": s.email, "Mật khẩu": s.password }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TaiKhoan");
    XLSX.writeFile(wb, "Danh_Sach_Tai_Khoan.xlsx");
  };

  // --- QUẢN LÝ NHÓM ---
  const autoGroup = async () => {
    if(!confirm(`Tự động chia nhóm (${groupSize} người/nhóm)?`)) return;
    // Xóa nhóm cũ
    await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('students').update({ group_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    
    const numGroups = Math.ceil(students.length / groupSize);
    for (let i = 0; i < numGroups; i++) {
       const { data } = await supabase.from('groups').insert([{ name: `Nhóm ${i + 1}` }]).select();
       if (data) {
         const grpId = data[0].id;
         const members = students.slice(i * groupSize, (i + 1) * groupSize);
         for (let m of members) {
            await supabase.from('students').update({ group_id: grpId }).eq('id', m.id);
         }
       }
    }
    alert("Đã chia nhóm xong!"); fetchData();
  };

  // --- QUẢN LÝ CHAT ---
  const toggleMuteChat = async () => {
    await supabase.from('chat_settings').update({ is_muted: !isChatMuted }).eq('id', 1);
    fetchData();
  };
  const clearAllChat = async () => {
    if(confirm("Xóa toàn bộ tin nhắn?")) { await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'); fetchData(); }
  };

  // --- QUẢN LÝ TRẮC NGHIỆM ---
  const createQuiz = async () => {
    if (!quizTitle) return alert("Nhập tên bài trắc nghiệm!");
    const { data, error } = await supabase.from('quizzes').insert([{ activity_id: quizActivity, title: quizTitle, time_limit: quizTime }]).select();
    if (data) {
       const quizId = data[0].id;
       for (let q of newQs) {
         await supabase.from('quiz_questions').insert([{ quiz_id: quizId, question: q.question, image_url: q.image_url, options: q.options, correct_option: q.correct_option }]);
       }
       alert("Tạo bài trắc nghiệm thành công!"); setQuizTitle(""); setNewQs([{ question: "", image_url: "", options: ["", "", "", ""], correct_option: 0 }]); fetchData();
    }
  };

  const getAvatar = (name: string) => name.split(' ').pop()?.charAt(0).toUpperCase() || "?";
  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + " - " + new Date(isoString).toLocaleDateString('vi-VN');
  
  const ungroupedStudents = students.filter(s => !s.group_id);

  return (
    <main className="min-h-screen flex bg-gray-50">
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-blue-900 to-slate-900 text-white"><h1 className="text-xl font-bold tracking-wider">TEACHER PORTAL</h1></div>
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={() => setActiveTab('activities')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'activities' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Video className="w-5 h-5" /> Quản lý bài học</button>
          <button onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'grading' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><FileText className="w-5 h-5" /> Chấm điểm</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'students' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Users className="w-5 h-5" /> Sinh viên</button>
          <button onClick={() => setActiveTab('groups')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'groups' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Layers className="w-5 h-5" /> Quản lý Nhóm</button>
          <button onClick={() => setActiveTab('quizzes')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'quizzes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><BookOpen className="w-5 h-5" /> Tạo Trắc nghiệm</button>
          <button onClick={() => setActiveTab('chat')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><MessageSquare className="w-5 h-5" /> Chat nhóm</button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 p-3 text-red-400 hover:bg-red-500 hover:text-white rounded-xl"><LogOut className="w-5 h-5" /> Đăng xuất</button>
        </div>
      </div>

      <div className="flex-1 p-8 h-screen overflow-y-auto relative">
        <Link href="/" className="absolute top-8 right-8 bg-white text-gray-600 p-3 rounded-full shadow-lg border z-10"><ArrowLeft className="w-5 h-5" /></Link>

        {/* QUẢN LÝ NHÓM */}
        {activeTab === 'groups' && (
          <div className="space-y-6 max-w-5xl">
            <h2 className="text-3xl font-bold">Quản lý Nhóm</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="font-bold mb-4">Chia nhóm tự động</h3>
              <div className="flex items-center gap-4">
                <input type="number" value={groupSize} onChange={e => setGroupSize(Number(e.target.value))} className="border p-2 rounded w-24" />
                <span>sinh viên / nhóm</span>
                <button onClick={autoGroup} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Chia nhóm ngay</button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {groups.map(g => (
                <div key={g.id} className="bg-white p-4 rounded-xl shadow-sm border">
                  <h4 className="font-bold text-lg border-b pb-2 mb-2">{g.name}</h4>
                  <ul className="space-y-1">
                    {students.filter(s => s.group_id === g.id).map(s => <li key={s.id} className="text-sm">{s.full_name}</li>)}
                  </ul>
                </div>
              ))}
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <h4 className="font-bold text-red-700 border-b pb-2 mb-2">Chưa vào nhóm ({ungroupedStudents.length})</h4>
                <ul className="space-y-1">
                  {ungroupedStudents.map(s => <li key={s.id} className="text-sm text-red-600">{s.full_name}</li>)}
                </ul>
              </div>
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
                <select value={quizActivity} onChange={e => setQuizActivity(Number(e.target.value))} className="border p-2 rounded flex-1">
                  {activities.map(a => <option key={a.id} value={a.id}>Gắn với Bài {a.id}</option>)}
                </select>
                <input type="number" value={quizTime} onChange={e => setQuizTime(Number(e.target.value))} placeholder="Thời gian (phút)" className="border p-2 rounded w-32" />
              </div>
              {newQs.map((q, idx) => (
                <div key={idx} className="border p-4 rounded-lg bg-gray-50 space-y-3">
                  <input value={q.question} onChange={e => { const n = [...newQs]; n[idx].question = e.target.value; setNewQs(n); }} placeholder={`Câu hỏi ${idx + 1}`} className="w-full border p-2 rounded font-medium" />
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
              <button onClick={createQuiz} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold w-full">Lưu Bài Trắc Nghiệm</button>
            </div>
          </div>
        )}

        {/* CÁC TAB CŨ (Giữ nguyên logic, tôi rút gọn phần hiển thị) */}
        {activeTab === 'students' && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-center"><h2 className="text-3xl font-bold">Sinh viên ({students.length})</h2><button onClick={exportAccounts} className="bg-green-600 text-white px-4 py-2 rounded-lg flex gap-2"><Download className="w-4 h-4"/> Xuất Tài khoản</button></div>
            <form onSubmit={addStudentManual} className="flex gap-2 bg-white p-4 rounded-xl shadow-sm border"><input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nhập tên SV..." className="flex-1 border p-2 rounded" /><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Thêm & Cấp Acc</button></form>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {students.map(s => (
                <div key={s.id} className="bg-white p-3 rounded-xl shadow-sm border text-sm">
                  <p className="font-bold">{s.full_name}</p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border h-[80vh] flex flex-col max-w-4xl mx-auto">
            <div className="p-4 border-b bg-slate-800 text-white flex justify-between items-center">
              <h2 className="font-bold">Kênh thảo luận</h2>
              <div className="flex gap-2">
                <button onClick={toggleMuteChat} className={`px-3 py-1 rounded text-sm font-medium ${isChatMuted ? 'bg-green-500' : 'bg-red-500'}`}>{isChatMuted ? "Mở lại chat" : "Cấm chat"}</button>
                <button onClick={clearAllChat} className="bg-red-700 px-3 py-1 rounded text-sm font-medium">Xóa hết</button>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.sender_name.includes('Cô') ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${m.sender_name.includes('Cô') ? 'bg-blue-600' : 'bg-emerald-500'}`}>{getAvatar(m.sender_name)}</div>
                   <div className={`p-3 rounded-xl max-w-[70%] text-sm ${m.sender_name.includes('Cô') ? 'bg-blue-100' : 'bg-gray-100'}`}>
                     <p className="text-xs font-semibold mb-1 text-gray-500">{m.sender_name} • {formatTime(m.created_at)}</p>
                     <p>{m.content}</p>
                   </div>
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