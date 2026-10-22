"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BookOpen, Clock, FileText, CheckCircle, MessageSquare, Send, ChevronRight, Lock } from "lucide-react";

export default function HocSinhPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [activeTab, setActiveTab] = useState("lessons");
  const [now, setNow] = useState(new Date());
  const [studentName, setStudentName] = useState("Sinh viên");

  useEffect(() => {
    // Lấy danh sách bài học
    supabase.from('activities').select('*').order('id').then(({ data }) => { if (data) setActivities(data); });
    
    // Lấy tin nhắn chat
    const fetchMsgs = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at');
      if (data) setMessages(data);
    };
    fetchMsgs();

    // Lắng nghe tin nhắn mới (Realtime)
    const channel = supabase.channel('chat_student').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      setMessages(prev => [...prev, payload.new]);
    }).subscribe();

    // Đồng hồ đếm ngược
    const timer = setInterval(() => setNow(new Date()), 1000);
    
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg) return;
    await supabase.from('messages').insert([{ sender_name: studentName, content: newMsg }]);
    setNewMsg("");
  };

  const getAvatar = (name: string) => name.split(' ').pop()?.charAt(0).toUpperCase() || "?";

  // Hàm tính toán deadline
  const getDeadlineStatus = (deadline: string) => {
    if (!deadline) return { isLate: false, text: "Không có hạn chót", color: "text-gray-500" };
    const d = new Date(deadline);
    const diff = d.getTime() - now.getTime();
    
    if (diff < 0) return { isLate: true, text: "Đã hết hạn nộp", color: "text-red-500" };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let text = "";
    if (days > 0) text = `Còn ${days} ngày ${hours} giờ`;
    else if (hours > 0) text = `Còn ${hours} giờ ${mins} phút`;
    else text = `Còn ${mins} phút`;
    
    return { isLate: false, text, color: "text-orange-500" };
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 font-bold text-xl">Vật Lí 11</Link>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-gray-700">Lớp học của em</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('lessons')} className={`flex items-center gap-2 font-medium ${activeTab === 'lessons' ? 'text-blue-600' : 'text-gray-500'}`}><BookOpen className="w-4 h-4"/> Bài học</button>
            <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-2 font-medium ${activeTab === 'chat' ? 'text-blue-600' : 'text-gray-500'}`}><MessageSquare className="w-4 h-4"/> Hỏi đáp</button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        {/* TAB BÀI HỌC */}
        {activeTab === 'lessons' && (
          <div className="space-y-6 animate-slide-up">
            <h1 className="text-3xl font-bold text-gray-800">14 Hoạt động học tập</h1>
            <div className="grid md:grid-cols-2 gap-4">
              {activities.map(act => {
                const dl = getDeadlineStatus(act.deadline);
                return (
                  <div key={act.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-sm">Bài {act.id}</div>
                        {dl.isLate ? <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded flex items-center gap-1"><Lock className="w-3 h-3"/> Đã khóa</span> : <span className={`text-xs font-medium flex items-center gap-1 ${dl.color}`}><Clock className="w-3 h-3"/> {dl.text}</span>}
                      </div>
                      <h3 className="font-bold text-lg text-gray-800 mb-1">{act.title}</h3>
                      <p className="text-sm text-gray-500 mb-4">{act.description || "Chưa có mô tả"}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-auto">
                        {act.document_url && (
                          <a href={act.document_url} target="_blank" className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                            <FileText className="w-4 h-4"/> Xem tài liệu
                          </a>
                        )}
                        {!dl.isLate && (
                          <Link href={`/nop-bai?activity=${act.id}`} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ml-auto">
                            Nộp bài <ChevronRight className="w-4 h-4"/>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border h-[75vh] flex flex-col animate-slide-up">
            <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5"/> Kênh hỏi đáp lớp học</h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.sender_name.includes('Cô') ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${m.sender_name.includes('Cô') ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                     {getAvatar(m.sender_name)}
                   </div>
                   <div className={`p-3 rounded-xl max-w-[70%] text-sm shadow-sm ${m.sender_name.includes('Cô') ? 'bg-blue-100 text-blue-900 rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm border'}`}>
                     <p className="text-xs font-semibold mb-1 opacity-70">{m.sender_name}</p>
                     <p>{m.content}</p>
                   </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t bg-white rounded-b-xl flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập câu hỏi cho cô..." className="flex-1 border p-2.5 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700"><Send className="w-5 h-5"/></button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}