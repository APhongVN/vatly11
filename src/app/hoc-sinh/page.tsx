"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BookOpen, Clock, FileText, Download, MessageSquare, Send, ChevronRight, Lock, X, Trash2, LogOut, Home } from "lucide-react";

export default function HocSinhPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [activeTab, setActiveTab] = useState("lessons");
  const [now, setNow] = useState(new Date());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const studentName = "Sinh viên"; // Giả lập

  const fetchData = async () => {
    const { data: acts } = await supabase.from('activities').select('*').order('id');
    if (acts) setActivities(acts);
    const { data: msgs } = await supabase.from('messages').select('*').order('created_at');
    if (msgs) setMessages(msgs);
    const { data: subs } = await supabase.from('submissions').select('*').eq('student_name', studentName);
    if (subs) setMySubmissions(subs);
  };

  useEffect(() => {
    fetchData();
    // Tự động làm mới chat mỗi 3 giây (Polling) để fix lỗi Realtime
    const interval = setInterval(fetchData, 3000);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(timer); };
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg) return;
    await supabase.from('messages').insert([{ sender_name: studentName, content: newMsg }]);
    setNewMsg(""); fetchData();
  };

  const getAvatar = (name: string) => name.split(' ').pop()?.charAt(0).toUpperCase() || "?";
  const getDeadlineStatus = (deadline: string) => {
    if (!deadline) return { isLate: false, text: "Không có hạn chót", color: "text-gray-500" };
    const d = new Date(deadline); const diff = d.getTime() - now.getTime();
    if (diff < 0) return { isLate: true, text: "Đã hết hạn nộp", color: "text-red-500" };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let text = days > 0 ? `Còn ${days} ngày ${hours} giờ` : hours > 0 ? `Còn ${hours} giờ ${mins} phút` : `Còn ${mins} phút`;
    return { isLate: false, text, color: "text-orange-500" };
  };
  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col relative">
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl flex justify-between text-white mb-2">
            <h3 className="font-semibold">Xem trước tài liệu</h3>
            <button onClick={() => setPreviewUrl(null)} className="hover:text-red-400"><X className="w-6 h-6"/></button>
          </div>
          <div className="w-full max-w-4xl h-[80vh] bg-white rounded-lg overflow-hidden flex justify-center items-center">
            {isImage(previewUrl) ? <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" /> : <iframe src={previewUrl} className="w-full h-full border-0" />}
          </div>
          <a href={previewUrl} target="_blank" download className="mt-4 bg-blue-600 px-6 py-2 rounded-lg text-white font-medium hover:bg-blue-700 flex items-center gap-2"><Download className="w-4 h-4"/> Tải xuống</a>
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-blue-600 font-bold text-xl">Lớp Vật Lí 11</span>
            <div className="flex gap-4 ml-8">
              <button onClick={() => setActiveTab('lessons')} className={`font-medium ${activeTab === 'lessons' ? 'text-blue-600' : 'text-gray-500'}`}>Bài học</button>
              <button onClick={() => setActiveTab('chat')} className={`font-medium ${activeTab === 'chat' ? 'text-blue-600' : 'text-gray-500'}`}>Hỏi đáp</button>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="text-gray-600 hover:text-blue-600 flex items-center gap-1 text-sm font-medium"><Home className="w-4 h-4"/> Trang chủ</Link>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium"><LogOut className="w-4 h-4"/> Đăng xuất</button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
        {activeTab === 'lessons' && (
          <div className="space-y-6 animate-slide-up">
            <h1 className="text-3xl font-bold text-gray-800">14 Hoạt động học tập</h1>
            <div className="grid md:grid-cols-2 gap-4">
              {activities.map(act => {
                const dl = getDeadlineStatus(act.deadline);
                return (
                  <div key={act.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-sm">Bài {act.id}</div>
                        {dl.isLate ? <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded flex items-center gap-1"><Lock className="w-3 h-3"/> Đã khóa</span> : <span className={`text-xs font-medium flex items-center gap-1 ${dl.color}`}><Clock className="w-3 h-3"/> {dl.text}</span>}
                      </div>
                      <h3 className="font-bold text-lg text-gray-800 mb-1">{act.title}</h3>
                      <p className="text-sm text-gray-500 mb-4">{act.description || "Chưa có mô tả"}</p>
                      {act.document_url && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setPreviewUrl(act.document_url)} className="flex-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center gap-1"><FileText className="w-4 h-4"/> Xem trước</button>
                          <a href={act.document_url} download className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center justify-center"><Download className="w-4 h-4"/></a>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 p-3 border-t flex justify-between items-center">
                      {mySubmissions.find(s => s.activity_id === act.id) ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-green-600 text-sm font-medium">Đã nộp bài</span>
                          <button onClick={async () => { if(confirm("Hủy nộp bài này?")) { await supabase.from('submissions').delete().eq('student_name', studentName).eq('activity_id', act.id); fetchData(); } }} className="text-red-500 text-sm hover:underline">Hủy nộp</button>
                        </div>
                      ) : !dl.isLate ? (
                        <Link href={`/nop-bai?activity=${act.id}`} className="w-full text-center text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg">Nộp bài</Link>
                      ) : <span className="text-red-500 text-sm w-full text-center">Đã khóa</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border h-[75vh] flex flex-col">
            <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl"><h2 className="font-bold">Kênh hỏi đáp</h2></div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.sender_name.includes('Cô') ? 'flex-row-reverse' : ''}`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${m.sender_name.includes('Cô') ? 'bg-blue-600' : 'bg-emerald-500'}`}>{getAvatar(m.sender_name)}</div>
                   <div className={`p-3 rounded-xl max-w-[70%] text-sm ${m.sender_name.includes('Cô') ? 'bg-blue-100 text-blue-900' : 'bg-white border text-gray-800'}`}><p className="text-xs font-semibold mb-1 text-gray-500">{m.sender_name}</p><p>{m.content}</p></div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập câu hỏi..." className="flex-1 border p-2.5 rounded-lg bg-gray-50 outline-none" />
              <button type="submit" className="bg-blue-600 text-white p-2.5 rounded-lg"><Send className="w-5 h-5"/></button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}