"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import * as XLSX from "xlsx";
import { LogOut, Home, Video, Users, FileText, Bot, Upload, MessageSquare, Send, Calendar, Download, CheckCircle, Trash2, ArrowLeft, Search, Save, X, Plus, Clock, Layers, BookOpen, Shuffle } from "lucide-react";

export default function GiaoVienPage() {
  const [activeTab, setActiveTab] = useState("activities"); 
  const [activities, setActivities] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isChatMuted, setIsChatMuted] = useState(false);
  
  // States
  const [newMsg, setNewMsg] = useState("");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [newStudentName, setNewStudentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // States Chấm điểm
  const [selectedGradingAct, setSelectedGradingAct] = useState<any>(null);
  const [rubricText, setRubricText] = useState(""); 
  
  // States Tạo Quiz
  const [quizTitle, setQuizTitle] = useState("");
  const [quizActivity, setQuizActivity] = useState(1);
  const [quizTime, setQuizTime] = useState(15);
  const [newQs, setNewQs] = useState([{ question: "", image_url: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }]);

  // States Tạo Nhóm cho Bài tập
  const [currentGroups, setCurrentGroups] = useState<any[]>([]); 
  const [numGroups, setNumGroups] = useState(4);
  const [maxStudentsPerGroup, setMaxStudentsPerGroup] = useState(6);

  const fetchData = async () => {
    const { data: acts } = await supabase.from('activities').select('*').order('id');
    const { data: studs } = await supabase.from('students').select('*').order('full_name');
    const { data: subs } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
    const { data: msgs } = await supabase.from('messages').select('*').order('created_at');
    const { data: qzs } = await supabase.from('quizzes').select('*').order('id');
    const { data: setting } = await supabase.from('chat_settings').select('is_muted').eq('id', 1).single();
    
    if (acts) setActivities(acts); if (studs) setStudents(studs); if (subs) setSubmissions(subs); if (msgs) setMessages(msgs);
    if (qzs) setQuizzes(qzs); if (setting) setIsChatMuted(setting.is_muted);
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchGroupsForActivity = async (actId: number) => {
    const { data } = await supabase.from('activity_groups').select('*, activity_group_members(*, students(*))').eq('activity_id', actId).order('group_number');
    if (data) setCurrentGroups(data);
  };

  const toggleExpand = (actId: number, isGroup: boolean) => {
    if (expandedAct === actId) { setExpandedAct(null); setCurrentGroups([]); }
    else { setExpandedAct(actId); if (isGroup) fetchGroupsForActivity(actId); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  // --- QUẢN LÝ SINH VIÊN ---
  const addStudentManual = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newStudentName.trim()) return;
    await supabase.from('students').insert([{ full_name: newStudentName.trim(), class_name: "11A1" }]);
    setNewStudentName(""); fetchData();
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      let names: string[] = [];
      data.forEach(row => {
        const val = row.find((cell: any) => typeof cell === 'string' && cell.trim().length > 3 && !cell.includes('STT') && !cell.includes('Tên'));
        if (val) names.push(val.trim());
      });
      names.sort((a, b) => (a.split(' ').pop() || "").localeCompare(b.split(' ').pop() || ""));
      await supabase.from('students').insert(names.map(n => ({ full_name: n, class_name: "11A1" })));
      fetchData();
    };
    reader.readAsBinaryString(file);
  };
  const deleteStudent = async (id: string) => { if(confirm("Xóa SV này?")) { await supabase.from('students').delete().eq('id', id); fetchData(); } };

  // --- QUẢN LÝ BÀI HỌC ---
  const saveActivity = async (id: number, e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const desc = (form.elements.namedItem('desc') as HTMLInputElement).value;
    const video = (form.elements.namedItem('video') as HTMLInputElement).value;
    const deadline = (form.elements.namedItem('deadline') as HTMLInputElement).value;
    const is_group = (form.elements.namedItem('is_group') as HTMLInputElement).checked;
    
    await supabase.from('activities').update({ title, description: desc, video_url: video, is_group, deadline: deadline ? new Date(deadline).toISOString() : null }).eq('id', id);
    alert("Đã lưu thay đổi!"); setExpandedAct(null); fetchData();
  };
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, actId: number) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('videos').upload(fileName, file);
    if (!error) {
      const { data } = await supabase.storage.from('videos').getPublicUrl(fileName);
      await supabase.from('activities').update({ document_url: data.publicUrl }).eq('id', actId);
      alert("Đã upload file!"); fetchData();
    }
  };

  // --- CHIA NHÓM ---
  const createGroups = async (actId: number, isRandom: boolean) => {
    if(!confirm(`Tạo ${numGroups} nhóm (tối đa ${maxStudentsPerGroup} SV/nhóm)? Thao tác này sẽ xóa các nhóm cũ của bài này.`)) return;
    await supabase.from('activity_groups').delete().eq('activity_id', actId);
    
    let pool = [...students];
    if (isRandom) pool = pool.sort(() => Math.random() - 0.5);

    let studentIndex = 0;
    for (let i = 1; i <= numGroups; i++) {
      const { data: groupData } = await supabase.from('activity_groups').insert([{ activity_id: actId, group_number: i }]).select();
      if (groupData) {
        const groupId = groupData[0].id;
        const membersToAdd = pool.slice(studentIndex, studentIndex + maxStudentsPerGroup);
        if (membersToAdd.length > 0) {
          const inserts = membersToAdd.map(s => ({ activity_group_id: groupId, student_id: s.id }));
          await supabase.from('activity_group_members').insert(inserts);
        }
        studentIndex += maxStudentsPerGroup;
      }
    }
    alert("Đã chia nhóm xong!"); fetchGroupsForActivity(actId);
  };

  // --- CHẤM ĐIỂM & CHAT ---
  const saveRubric = async () => {
    if (!selectedGradingAct) return;
    await supabase.from('activities').update({ grading_rubric: rubricText }).eq('id', selectedGradingAct.id);
    alert("Đã lưu ma trận điểm!"); fetchData();
  };
  const gradeWithAI = async (id: string, answer: string) => {
    if (!rubricText) return alert("Hãy nhập ma trận điểm trước khi chấm!");
    setGradingId(id);
    const res = await fetch('/api/grade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentAnswer: answer, rubricText }) });
    const data = await res.json();
    if (data.score !== undefined) { await supabase.from('submissions').update({ ai_score: data.score, ai_feedback: data.feedback, status: 'graded' }).eq('id', id); fetchData(); }
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
       for (let q of newQs) await supabase.from('quiz_questions').insert([{ quiz_id: data[0].id, question: q.question, image_url: q.image_url, options: q.options, correct_option: q.correct_option, explanation: q.explanation }]);
       alert("Tạo bài thành công!"); setQuizTitle(""); setNewQs([{ question: "", image_url: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }]); fetchData();
    }
  };

  const getAvatar = (name: string) => name.split(' ').pop()?.charAt(0).toUpperCase() || "?";
  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + " - " + new Date(isoString).toLocaleDateString('vi-VN');
  const currentSubmissions = selectedGradingAct ? submissions.filter(s => s.activity_id === selectedGradingAct.id) : [];

  return (
    <main className="min-h-screen flex bg-gray-50">
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-blue-900 to-slate-900 text-white"><h1 className="text-xl font-bold tracking-wider">TEACHER PORTAL</h1></div>
        <div className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('activities')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'activities' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Video className="w-5 h-5" /> Quản lý bài học</button>
          <button onClick={() => setActiveTab('grading')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'grading' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><FileText className="w-5 h-5" /> Chấm điểm</button>
          <button onClick={() => setActiveTab('students')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'students' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Users className="w-5 h-5" /> Sinh viên</button>
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

        {/* TAB BÀI HỌC */}
        {activeTab === 'activities' && (
          <div className="space-y-6 max-w-5xl">
            <h2 className="text-3xl font-bold">Quản lý 14 Bài học</h2>
            <div className="space-y-3">
              {activities.map(act => (
                <div key={act.id} className={`bg-white rounded-xl shadow-sm border transition-all ${expandedAct === act.id ? 'border-blue-400 ring-1 ring-blue-100' : ''}`}>
                  <div onClick={() => toggleExpand(act.id, act.is_group)} className="p-4 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${act.is_group ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-700'}`}>{act.id}</div>
                      <div>
                        <h3 className="font-bold text-lg">{act.title}</h3>
                        <p className="text-xs text-gray-500">{act.description} {act.is_group && <span className="text-orange-500 font-bold ml-2">(Bài tập nhóm)</span>}</p>
                      </div>
                    </div>
                    <button className="text-blue-600 font-medium text-sm">{expandedAct === act.id ? "Đóng" : "Chỉnh sửa"}</button>
                  </div>
                  
                  {expandedAct === act.id && (
                    <div className="border-t bg-gray-50/50">
                      <form onSubmit={(e) => saveActivity(act.id, e)} className="p-5 border-b space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <input name="title" defaultValue={act.title} className="p-2 border rounded outline-none" required />
                          <input name="desc" defaultValue={act.description || ""} className="p-2 border rounded outline-none" />
                          <input name="video" defaultValue={act.video_url || ""} placeholder="Link Video" className="p-2 border rounded outline-none" />
                          <input type="datetime-local" name="deadline" defaultValue={act.deadline ? new Date(act.deadline).toISOString().slice(0, 16) : ""} className="p-2 border rounded outline-none" />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 font-medium text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" name="is_group" defaultChecked={act.is_group} className="w-4 h-4 text-blue-600 rounded" /> Đây là bài tập NHÓM
                          </label>
                        </div>
                        <div className="flex gap-4 items-center pt-2">
                          <label className="bg-blue-100 text-blue-700 px-4 py-2 rounded cursor-pointer"><Upload className="w-4 h-4 inline mr-2"/>Tải Tài liệu<input type="file" className="hidden" onChange={(e) => handleUploadFile(e, act.id)} /></label>
                          {act.document_url && <a href={act.document_url} target="_blank" className="text-green-600 underline text-sm">Xem file</a>}
                          <button type="submit" className="ml-auto bg-blue-600 text-white px-4 py-2 rounded"><Save className="w-4 h-4 inline mr-2"/>Lưu thông tin bài</button>
                        </div>
                      </form>

                      {act.is_group && (
                        <div className="p-5 bg-orange-50/50">
                          <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2"><Layers className="w-5 h-5"/> Quản lý Nhóm cho bài tập này</h4>
                          <div className="flex flex-wrap items-end gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                            <div><label className="text-xs font-semibold text-gray-600 block mb-1">Số lượng nhóm</label><input type="number" value={numGroups} onChange={e => setNumGroups(Number(e.target.value))} className="border p-2 rounded w-24 outline-none" min="1" /></div>
                            <div><label className="text-xs font-semibold text-gray-600 block mb-1">SV tối đa / nhóm</label><input type="number" value={maxStudentsPerGroup} onChange={e => setMaxStudentsPerGroup(Number(e.target.value))} className="border p-2 rounded w-24 outline-none" min="1" /></div>
                            <button onClick={() => createGroups(act.id, false)} className="bg-slate-800 text-white px-4 py-2 rounded font-medium hover:bg-slate-900 shadow-sm">Tạo nhóm (Tuần tự)</button>
                            <button onClick={() => createGroups(act.id, true)} className="bg-emerald-600 text-white px-4 py-2 rounded font-medium hover:bg-emerald-700 flex items-center gap-2 shadow-sm"><Shuffle className="w-4 h-4"/> Chia ngẫu nhiên</button>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4">
                            {currentGroups.length === 0 && <p className="text-sm text-gray-500 italic">Chưa có nhóm nào. Hãy bấm nút để chia nhóm.</p>}
                            {currentGroups.map(g => (
                              <div key={g.id} className="bg-white p-4 rounded-xl shadow-sm border">
                                <h5 className="font-bold border-b pb-2 mb-2 text-blue-700">Nhóm {g.group_number}</h5>
                                <ul className="space-y-1">
                                  {g.activity_group_members.map((m: any) => (
                                    <li key={m.id} className="text-sm flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-gray-200 text-[10px] flex items-center justify-center font-bold">{getAvatar(m.students.full_name)}</div>{m.students.full_name}</li>
                                  ))}
                                  {g.activity_group_members.length === 0 && <li className="text-xs text-gray-400 italic">(Trống)</li>}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CHẤM ĐIỂM */}
        {activeTab === 'grading' && (
          <div className="flex gap-6 max-w-6xl h-[85vh]">
            <div className="w-1/3 bg-white rounded-xl shadow-sm border flex flex-col">
              <h2 className="p-4 border-b font-bold bg-gray-50 rounded-t-xl text-lg">Chọn Bài tập</h2>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {activities.map(act => (
                  <button key={act.id} onClick={() => { setSelectedGradingAct(act); setRubricText(act.grading_rubric || ""); }} className={`w-full text-left p-3 rounded-lg transition-colors ${selectedGradingAct?.id === act.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>
                    <span className="font-bold block">Bài {act.id}: {act.title}</span>
                    <span className="text-xs opacity-80">{act.is_group ? "Bài tập nhóm" : "Cá nhân"}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="w-2/3 bg-white rounded-xl shadow-sm border flex flex-col">
              {selectedGradingAct ? (
                <>
                  <div className="p-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                    <h2 className="font-bold text-lg text-blue-700">Bài {selectedGradingAct.id}: {selectedGradingAct.title}</h2>
                    <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">{currentSubmissions.length} bài nộp</span>
                  </div>
                  <div className="p-4 border-b bg-blue-50/50">
                    <label className="font-bold text-sm text-gray-700 block mb-1">Ma trận điểm:</label>
                    <div className="flex gap-2"><textarea value={rubricText} onChange={e => setRubricText(e.target.value)} className="flex-1 p-2 border rounded text-sm h-16 outline-none" placeholder="VD: 2đ nêu đúng công thức..." /><button onClick={saveRubric} className="bg-slate-800 text-white px-4 rounded text-sm font-medium hover:bg-slate-900">Lưu Ma trận</button></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {currentSubmissions.length === 0 && <p className="text-center text-gray-500 mt-10">Chưa có sinh viên nào nộp bài này.</p>}
                    {currentSubmissions.map(sub => (
                      <div key={sub.id} className="border rounded-xl p-3 shadow-sm bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-gray-800 flex items-center gap-2">{sub.group_name ? <><Users className="w-4 h-4 text-orange-500"/> {sub.group_name}</> : sub.student_name}</span>
                          <span className="text-xs text-gray-400">{formatTime(sub.submitted_at)}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-sm mb-2">{sub.answer || "Nộp file đính kèm"}</div>
                        {sub.file_url && <a href={sub.file_url} target="_blank" className="text-blue-600 text-xs underline block mb-2">Xem file đính kèm</a>}
                        <div className="flex gap-2 items-center">
                          <button onClick={() => gradeWithAI(sub.id, sub.answer)} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium flex gap-1 items-center"><Bot className="w-3 h-3"/> AI Chấm</button>
                          <input type="number" placeholder="Điểm" className="border p-1.5 rounded w-20 text-xs" id={`score-${sub.id}`} defaultValue={sub.ai_score || ""} />
                          <input type="text" placeholder="Nhận xét..." className="border p-1.5 rounded flex-1 text-xs" id={`fb-${sub.id}`} defaultValue={sub.ai_feedback || ""} />
                          <button onClick={async () => { await supabase.from('submissions').update({ ai_score: Number((document.getElementById(`score-${sub.id}`) as HTMLInputElement).value), ai_feedback: (document.getElementById(`fb-${sub.id}`) as HTMLInputElement).value, status: 'graded' }).eq('id', sub.id); fetchData(); }} className="bg-green-600 text-white p-1.5 rounded"><CheckCircle className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><FileText className="w-16 h-16 mb-4 opacity-20" /><p>Chọn một bài tập bên trái để chấm điểm</p></div>}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6 max-w-5xl">
            <h2 className="text-3xl font-bold">Sinh viên ({students.length})</h2>
            <div className="flex gap-4">
              <form onSubmit={addStudentManual} className="flex gap-2 bg-white p-4 rounded-xl shadow-sm border flex-1"><input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nhập tên SV..." className="flex-1 border p-2 rounded outline-none" required /><button className="bg-blue-600 text-white px-4 py-2 rounded">Thêm</button></form>
              <div className="bg-white p-4 rounded-xl shadow-sm border flex-1 flex items-center"><input type="file" accept=".xlsx" onChange={handleFileUpload} className="text-sm" /></div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border">
               <div className="relative mb-6"><Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm sinh viên..." className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 outline-none" /></div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <div key={s.id} className="bg-gray-50 border px-3 py-2 rounded-lg text-sm font-medium flex justify-between items-center group">{s.full_name}<button onClick={() => deleteStudent(s.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></div>
                ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="space-y-6 max-w-4xl">
            <h2 className="text-3xl font-bold">Tạo Bài Trắc nghiệm</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} placeholder="Tên bài trắc nghiệm..." className="w-full border p-2 rounded outline-none" />
              <div className="flex gap-4"><select value={quizActivity} onChange={e => setQuizActivity(Number(e.target.value))} className="border p-2 rounded flex-1 outline-none">{activities.map(a => <option key={a.id} value={a.id}>Gắn với Bài {a.id}</option>)}</select><input type="number" value={quizTime} onChange={e => setQuizTime(Number(e.target.value))} className="border p-2 rounded w-32 outline-none" placeholder="Thời gian (phút)" /></div>
              {newQs.map((q, idx) => (
                <div key={idx} className="border p-4 rounded-lg bg-gray-50 space-y-3">
                  <input value={q.question} onChange={e => { const n = [...newQs]; n[idx].question = e.target.value; setNewQs(n); }} placeholder={`Câu hỏi ${idx + 1}`} className="w-full border p-2 rounded outline-none" />
                  <input value={q.image_url} onChange={e => { const n = [...newQs]; n[idx].image_url = e.target.value; setNewQs(n); }} placeholder="Link ảnh (nếu có)" className="w-full border p-2 rounded text-sm outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2"><input type="radio" checked={q.correct_option === oIdx} onChange={() => { const n = [...newQs]; n[idx].correct_option = oIdx; setNewQs(n); }} /><input value={opt} onChange={e => { const n = [...newQs]; n[idx].options[oIdx] = e.target.value; setNewQs(n); }} placeholder={`Đáp án ${oIdx + 1}`} className="w-full border p-2 rounded outline-none" /></div>
                    ))}
                  </div>
                  <textarea value={q.explanation} onChange={e => { const n = [...newQs]; n[idx].explanation = e.target.value; setNewQs(n); }} placeholder="Giải thích đáp án..." className="w-full border p-2 rounded text-sm outline-none h-16" />
                </div>
              ))}
              <button onClick={() => setNewQs([...newQs, { question: "", image_url: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }])} className="text-blue-600 font-medium text-sm">+ Thêm câu hỏi</button>
              <button onClick={createQuiz} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold w-full">Lưu Bài</button>
            </div>
          </div>
        )}

        {/* TAB CHAT (Đã khôi phục nút Xóa / Cấm chat) */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border h-[80vh] flex flex-col max-w-4xl mx-auto">
            <div className="p-4 border-b bg-slate-800 text-white flex justify-between items-center">
              <h2 className="font-bold">Kênh thảo luận</h2>
              <div className="flex gap-2">
                <button onClick={toggleMuteChat} className={`px-3 py-1 rounded text-sm font-medium ${isChatMuted ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>{isChatMuted ? "Mở lại chat" : "Cấm chat"}</button>
                <button onClick={clearAllChat} className="bg-red-700 hover:bg-red-800 px-3 py-1 rounded text-sm font-medium">Xóa hết</button>
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
            <form onSubmit={sendMessage} className="p-4 border-t flex gap-2"><input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập tin nhắn..." className="flex-1 border p-2 rounded-lg outline-none" /><button type="submit" className="bg-blue-600 text-white p-2 rounded-lg"><Send className="w-5 h-5"/></button></form>
          </div>
        )}
      </div>
    </main>
  );
}