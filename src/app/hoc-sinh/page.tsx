"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BookOpen, Clock, FileText, MessageSquare, Send, ArrowLeft, LogOut, CheckCircle2, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HocSinhPage() {
  const [student, setStudent] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [activeTab, setActiveTab] = useState("lessons");
  const [now, setNow] = useState(new Date());
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
  
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newMsg || isChatMuted) return;
    await supabase.from('messages').insert([{ sender_name: student.full_name, content: newMsg }]);
    setNewMsg("");
  };

  // Hàm đọc tin nhắn bằng giọng nói
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Dừng câu đang đọc
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Trình duyệt của bạn không hỗ trợ tính năng đọc!");
    }
  };

  const getAvatar = (name: string) => name.split(' ').pop()?.charAt(0).toUpperCase() || "?";
  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + " - " + new Date(isoString).toLocaleDateString('vi-VN');

  if (!student) return <div className="p-10 text-center font-bold">Đang tải dữ liệu...</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col relative">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-blue-700 font-extrabold text-2xl">VẬT LÍ 11</span>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('lessons')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'lessons' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Bài học</button>
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
        {activeTab === 'lessons' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Bài học của em</h1>
            <div className="grid md:grid-cols-3 gap-6">
              {activities.map(act => (
                <div key={act.id} className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col">
                  <div className="bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-lg text-sm w-fit mb-3">Bài {act.id}</div>
                  <h3 className="font-bold text-lg mb-2">{act.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 flex-1">{act.description}</p>
                  {act.document_url && (
                    <a href={act.document_url} target="_blank" className="w-full text-sm bg-gray-50 border py-2 rounded-xl mb-2 flex justify-center gap-2"><FileText className="w-4 h-4"/> Xem tài liệu</a>
                  )}
                  <Link href={`/nop-bai?activity=${act.id}`} className="w-full text-center bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700">Nộp bài</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Bài tập Trắc nghiệm</h1>
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
            <div className="p-4 border-b bg-blue-600 text-white flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5"/> Kênh hỏi đáp</h2>
              {isChatMuted && <span className="text-xs bg-red-500 px-2 py-1 rounded">Giáo viên đã khóa chat</span>}
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.sender_name.includes('Cô') ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${m.sender_name.includes('Cô') ? 'bg-blue-600' : 'bg-emerald-500'}`}>{getAvatar(m.sender_name)}</div>
                   <div className={`flex flex-col ${m.sender_name.includes('Cô') ? 'items-end' : 'items-start'}`}>
                     <div className={`p-3 rounded-2xl max-w-[300px] text-sm shadow-sm ${m.sender_name.includes('Cô') ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm'}`}>
                       <p>{m.content}</p>
                       <button onClick={() => speakText(m.content)} className={`mt-1 ${m.sender_name.includes('Cô') ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-blue-500'}`} title="Nghe AI đọc">
                          <Volume2 className="w-4 h-4" />
                       </button>
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