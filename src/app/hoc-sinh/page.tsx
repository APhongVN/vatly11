"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BookOpen, Clock, FileText, Download, MessageSquare, Send, ChevronRight, Lock, X, LogOut, ArrowLeft, CheckCircle2, Volume2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HocSinhPage() {
  const [student, setStudent] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [activeTab, setActiveTab] = useState("personal"); // personal, group, quizzes, chat
  const [now, setNow] = useState(new Date());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('student_session');
    if (!session) { router.push('/login'); return; }
    const parsed = JSON.parse(session);
    setStudent(parsed);

    const fetchData = async () => {
      const { data: acts } = await supabase.from('activities').select('*').order('id');
      if (acts) setActivities(acts);
      const { data: msgs } = await supabase.from('messages').select('*').order('created_at');
      if (msgs) setMessages(msgs);
      
      // Lấy bài nộp cá nhân
      const { data: subs } = await supabase.from('submissions').select('*').eq('student_name', parsed.full_name);
      if (subs) setMySubmissions(subs);
      
      const { data: qzs } = await supabase.from('quizzes').select('*').order('id');
      if (qzs) setQuizzes(qzs);
      const { data: setting } = await supabase.from('chat_settings').select('is_muted').eq('id', 1).single();
      if (setting) setIsChatMuted(setting.is_muted);
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(timer); };
  }, [router]);

  const handleLogout = () => { localStorage.removeItem('student_session'); router.push("/login"); };
  
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'vi-VN'; window.speechSynthesis.speak(utterance); }
  };
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newMsg || isChatMuted) return;
    await supabase.from('messages').insert([{ sender_name: student.full_name, content: newMsg }]);
    setNewMsg("");
  };

  const getAvatar = (name: string) => name.split(' ').pop()?.charAt(0).toUpperCase() || "?";
  const getDeadlineStatus = (deadline: string) => {
    if (!deadline) return { isLate: false, text: "Không có hạn", color: "text-gray-500" };
    const d = new Date(deadline); const diff = d.getTime() - now.getTime();
    if (diff < 0) return { isLate: true, text: "Đã khóa", color: "text-red-500" };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)); const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let text = days > 0 ? `Còn ${days} ngày` : hours > 0 ? `Còn ${hours} giờ` : `Còn ${mins} phút`;
    return { isLate: false, text, color: "text-orange-500" };
  };
  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + " - " + new Date(isoString).toLocaleDateString('vi-VN');

  if (!student) return <div className="p-10 text-center font-bold">Đang tải...</div>;

  // Phân loại bài tập
  const personalActs = activities.filter(a => !a.is_group);
  const groupActs = activities.filter(a => a.is_group);

  // Render thẻ bài tập
  const renderActivityCard = (act: any) => {
    const dl = getDeadlineStatus(act.deadline);
    // Với bài nhóm, check xem nhóm đã nộp chưa (tạm check tên nhóm trong submissions)
    const isSubmitted = mySubmissions.some(s => s.activity_id === act.id);
    
    return (
      <div key={act.id} className="bg-white rounded-2xl shadow-sm border flex flex-col hover:shadow-md transition-all">
        <div className="h-2 w-full bg-gradient-to-r from-blue-400 to-indigo-500"></div>
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start mb-3">
            <div className="bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-sm border">Bài {act.id}</div>
            {dl.isLate ? <span className="bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded-md flex items-center gap-1"><Lock className="w-3 h-3"/> Đã khóa</span> : <span className={`text-xs font-semibold flex items-center gap-1 ${dl.color} bg-orange-50 px-2.5 py-1 rounded-md border`}><Clock className="w-3 h-3"/> {dl.text}</span>}
          </div>
          <h3 className="font-bold text-lg text-gray-800 mb-2">{act.title}</h3>
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{act.description || "Chưa có mô tả"}</p>
          {act.document_url && (
            <button onClick={() => setPreviewUrl(act.document_url)} className="w-full text-sm bg-gray-50 border hover:bg-gray-100 py-2 rounded-xl flex justify-center gap-1.5 font-medium"><FileText className="w-4 h-4"/> Xem tài liệu</button>
          )}
        </div>
        <div className="bg-gray-50/80 p-4 border-t flex justify-between items-center">
          {isSubmitted ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-green-600 text-sm font-bold flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5"/> Đã nộp</span>
              {!dl.isLate && <Link href={act.is_group ? `/phieu-nhom?activity=${act.id}` : `/nop-bai?activity=${act.id}`} className="text-blue-600 text-sm font-medium hover:underline">Nộp lại</Link>}
            </div>
          ) : !dl.isLate ? (
            <Link href={act.is_group ? `/phieu-nhom?activity=${act.id}` : `/nop-bai?activity=${act.id}`} className="w-full text-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2">Nộp bài <ChevronRight className="w-4 h-4"/></Link>
          ) : <span className="text-red-500 text-sm w-full text-center font-medium">Đã khóa</span>}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col relative">
      {previewUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl flex justify-between text-white mb-4"><h3 className="font-semibold text-lg">Xem trước tài liệu</h3><button onClick={() => setPreviewUrl(null)} className="hover:text-red-400"><X className="w-6 h-6"/></button></div>
          <div className="w-full max-w-5xl h-[80vh] bg-white rounded-xl overflow-hidden shadow-2xl">{isImage(previewUrl) ? <img src={previewUrl} className="w-full h-full object-contain" /> : <iframe src={previewUrl} className="w-full h-full border-0" />}</div>
          <a href={previewUrl} target="_blank" download className="mt-6 bg-blue-600 px-8 py-3 rounded-xl text-white font-bold hover:bg-blue-700 flex items-center gap-2"><Download className="w-5 h-5"/> Tải xuống</a>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-blue-700 font-extrabold text-2xl">VẬT LÍ 11</span>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('personal')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'personal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Cá nhân</button>
              <button onClick={() => setActiveTab('group')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'group' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Nhóm</button>
              <button onClick={() => setActiveTab('quizzes')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'quizzes' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Trắc nghiệm</button>
              <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'chat' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Hỏi đáp</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-gray-700 hidden md:block">{student.full_name}</span>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700 flex items-center gap-1.5 text-sm font-semibold bg-red-50 px-3 py-2 rounded-lg"><LogOut className="w-4 h-4"/> Đăng xuất</button>
          </div>
        </div>
      </header>

      <Link href="/" className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 z-40"><ArrowLeft className="w-6 h-6" /></Link>

      <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        
        {activeTab === 'personal' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-extrabold text-gray-800">Bài tập Cá nhân</h1>
            {personalActs.length === 0 ? <p className="text-gray-500">Chưa có bài tập cá nhân nào.</p> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{personalActs.map(renderActivityCard)}</div>}
          </div>
        )}

        {activeTab === 'group' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2"><Users className="w-8 h-8 text-blue-600"/> Bài tập Nhóm</h1>
            {groupActs.length === 0 ? <p className="text-gray-500">Chưa có bài tập nhóm nào được giao.</p> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{groupActs.map(renderActivityCard)}</div>}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-800">Bài tập Trắc nghiệm</h1>
            <div className="grid md:grid-cols-2 gap-4">
              {quizzes.map(qz => (
                <div key={qz.id} className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{qz.title}</h3>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded flex items-center gap-1"><Clock className="w-3 h-3"/> {qz.time_limit} phút</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Bài tập số {qz.activity_id}</p>
                  <Link href={`/lam-bai?quiz=${qz.id}`} className="mt-auto bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-center hover:bg-emerald-700">Vào làm bài</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl shadow-xl border h-[75vh] flex flex-col max-w-4xl mx-auto overflow-hidden">
            <div className="p-4 border-b bg-blue-600 text-white flex justify-between items-center"><h2 className="font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5"/> Kênh hỏi đáp</h2>{isChatMuted && <span className="text-xs bg-red-500 px-2 py-1 rounded">Giáo viên đã khóa chat</span>}</div>
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.sender_name.includes('Cô') ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${m.sender_name.includes('Cô') ? 'bg-blue-600' : 'bg-emerald-500'}`}>{getAvatar(m.sender_name)}</div>
                   <div className={`flex flex-col ${m.sender_name.includes('Cô') ? 'items-end' : 'items-start'}`}>
                     <div className={`p-3 rounded-2xl max-w-[300px] text-sm shadow-sm ${m.sender_name.includes('Cô') ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm'}`}>
                       <p>{m.content}</p>
                       <button onClick={() => speakText(m.content)} className={`mt-1 ${m.sender_name.includes('Cô') ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-blue-500'}`} title="Nghe AI đọc"><Volume2 className="w-4 h-4" /></button>
                     </div>
                     <span className="text-[10px] text-gray-400 mt-1 px-1">{m.sender_name} • {formatTime(m.created_at)}</span>
                   </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder={isChatMuted ? "Chat đang bị khóa..." : "Nhập tin nhắn..."} disabled={isChatMuted} className="flex-1 border p-3 rounded-xl bg-gray-50 disabled:opacity-50" />
              <button type="submit" disabled={isChatMuted} className="bg-blue-600 text-white p-3 rounded-xl disabled:opacity-50"><Send className="w-5 h-5"/></button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}