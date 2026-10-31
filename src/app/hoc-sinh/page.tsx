"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  BookOpen, Clock, FileText, Download, MessageSquare, Send,
  ChevronRight, Lock, X, LogOut, ArrowLeft, CheckCircle2,
  Volume2, Users, Trophy, Target, Sparkles, Microscope,
  Award, TrendingUp, HelpCircle, ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import VirtualLab from "@/components/VirtualLab";
import { filterSubmissionsForStudentGroups } from "@/lib/group-submissions.mjs";
import ActivityResources from "@/components/ActivityResources";
import { ACTIVITIES } from "@/lib/data/activities";

const attachmentHref = (value: string) => value.startsWith("http") ? value : `/api/files?bucket=${value.startsWith("chat/") || value.startsWith("submissions/") || value.startsWith("group-submissions/") ? "class-work" : "videos"}&path=${encodeURIComponent(value)}`;

export default function HocSinhPage() {
  const [student, setStudent] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [groupActs, setGroupActs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [myGroupSubs, setMyGroupSubs] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [now, setNow] = useState(new Date());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const loadIdentity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (cancelled) return;
        setPreviewMode(true);
        setStudent({ id: "preview-student", full_name: "Nguyễn Minh Anh", class_name: "11A1" });
        setActivities(ACTIVITIES);
        setGroupActs([{ id: "preview-assignment", title: "Báo cáo thí nghiệm tụ điện", description: "Mẫu hoạt động nhóm để xem trước giao diện.", deadline: null }]);
        setMessages([
          { id: "preview-message-1", sender_name: "Cô giáo", content: "Các em nhớ ghi rõ đơn vị trong bảng số liệu nhé.", created_at: new Date().toISOString() },
          { id: "preview-message-2", sender_name: "Nguyễn Minh Anh", content: "Cô ơi, em đã hoàn thành phiếu thí nghiệm ạ.", created_at: new Date().toISOString() },
        ]);
        setMySubmissions([{ id: "preview-submission", student_id: "preview-student", student_name: "Nguyễn Minh Anh", activity_id: 1, ai_score: 8.5, status: "graded", submitted_at: new Date().toISOString(), answer: "Bản ghi minh họa; không phải dữ liệu thật." }]);
        setMyGroupSubs([{ id: "preview-group-submission", assignment_id: "preview-assignment", group_id: "preview-group", group_name: "Nhóm Thí nghiệm A", status: "pending" }]);
        setQuizzes([]);
        setIsChatMuted(false);
        return;
      }
      const { data: profile } = await supabase.from('students').select('id,full_name,class_name').eq('auth_user_id', user.id).maybeSingle();
      if (!profile) { router.replace('/login?error=student-profile'); return; }
      if (cancelled) return;
      localStorage.setItem('student_session', JSON.stringify(profile));
      setStudent(profile);
      fetchData(profile);
    };
    void loadIdentity();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (previewMode || !student) return;
    const refreshChat = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(300);
      if (data) setMessages(data);
    };
    const timer = window.setInterval(() => void refreshChat(), 5000);
    return () => window.clearInterval(timer);
  }, [previewMode, student]);
  async function fetchData(student: any) {
    if (!student) return;
    const { data: acts } = await supabase.from('activities').select('*').order('id');
    if (acts) setActivities(acts);

    const { data: gActs } = await supabase.from('group_assignments').select('*').order('created_at', { ascending: false });
    if (gActs) setGroupActs(gActs);

    const { data: msgs } = await supabase.from('messages').select('*').order('created_at');
    if (msgs) setMessages(msgs);

    const { data: subs } = await supabase.from('submissions').select('*').eq('student_id', student.id);
    if (subs) setMySubmissions(subs);

    const { data: memberOf } = await supabase.from('group_assignment_members').select('*, group_assignment_groups(*)').eq('student_id', student.id);
    if (memberOf && memberOf.length > 0) {
      const assignIds = memberOf.map((m: any) => m.group_assignment_groups.assignment_id);
      const { data: gSubs } = await supabase.from('group_submissions').select('*').in('assignment_id', assignIds);
      if (gSubs) setMyGroupSubs(filterSubmissionsForStudentGroups(memberOf, gSubs));
    } else {
      setMyGroupSubs([]);
    }

    const { data: qzs } = await supabase.from('quizzes').select('*').order('id');
    if (qzs) setQuizzes(qzs);
    const { data: setting } = await supabase.from('chat_settings').select('is_muted').eq('id', 1).single();
    if (setting) setIsChatMuted(setting.is_muted);
  }

  const handleLogout = async () => {
    localStorage.removeItem('student_session');
    await supabase.auth.signOut();
    router.push("/login");
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMsg.trim() && !chatFile) || isChatMuted || isSendingChat) return;
    setIsSendingChat(true);
    try {
      let attachment: Record<string, string> = {};
      if (chatFile) {
        if (chatFile.size > 25 * 1024 * 1024) throw new Error("Tệp chat tối đa 25 MB.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập hết hạn. Em hãy đăng nhập lại.");
        const safeName = chatFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `chat/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("class-work").upload(path, chatFile, { upsert: false, contentType: chatFile.type || "application/octet-stream" });
        if (uploadError) throw uploadError;
        attachment = { attachment_url: path, attachment_name: chatFile.name, attachment_type: chatFile.type || "application/octet-stream" };
      }
      const { error } = await supabase.from("messages").insert([{ sender_name: student.full_name, content: newMsg.trim(), ...attachment }]);
      if (error) throw error;
      setNewMsg(""); setChatFile(null); await fetchData(student);
    } catch (error) { alert(error instanceof Error ? error.message : "Không gửi được tin nhắn."); }
    finally { setIsSendingChat(false); }
  };
  const deleteOwnMessage = async (message: any) => {
    if (message.sender_name !== student?.full_name) return;
    if (!confirm("Xóa tin nhắn của em?")) return;
    if (message.attachment_url && !message.attachment_url.startsWith("http")) {
      const { error: fileError } = await supabase.storage.from("class-work").remove([message.attachment_url]);
      if (fileError) { alert("Không xóa được tệp đính kèm: " + fileError.message); return; }
    }
    const { error } = await supabase.from("messages").delete().eq("id", message.id).eq("sender_name", student.full_name);
    if (error) alert("Không xóa được tin nhắn: " + error.message);
    else setMessages((current) => current.filter((item) => item.id !== message.id));
  };
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const getAvatar = (name: string) => (name ? name.split(' ').pop()?.charAt(0).toUpperCase() || "?" : "?");

  const getDeadlineStatus = (deadline: string) => {
    if (!deadline) return { isLate: false, text: "Không có hạn", color: "text-slate-500", bg: "bg-slate-50 border-slate-200" };
    const d = new Date(deadline);
    const diff = d.getTime() - now.getTime();
    if (diff < 0) return { isLate: true, text: "Đã quá hạn", color: "text-rose-600", bg: "bg-rose-50 border-rose-100" };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let text = days > 0 ? `Còn ${days} ngày` : hours > 0 ? `Còn ${hours} giờ` : `Còn ${mins} phút`;
    return { isLate: false, text, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + " - " + d.toLocaleDateString('vi-VN');
  };

  // Tính toán tiến độ cá nhân
  const completedCount = mySubmissions.length;
  const totalActCount = activities.length || 1;
  const completionPct = Math.min(100, Math.round((completedCount / totalActCount) * 100));
  const gradedList = mySubmissions.filter(s => s.ai_score !== null && s.ai_score !== -1);
  const avgScore = gradedList.length > 0
    ? (gradedList.reduce((acc, cur) => acc + cur.ai_score, 0) / gradedList.length).toFixed(1)
    : "Chưa có";

  if (!student) return <div className="p-10 text-center font-bold text-slate-500">Đang tải thông tin học sinh...</div>;

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 flex flex-col relative"
      onClickCapture={(event) => {
        if (!previewMode || (event.target instanceof Element && (event.target.closest("[data-preview-navigation]") || event.target.closest('a[href="/"]')))) return;
        event.preventDefault(); event.stopPropagation();
      }}
      onSubmitCapture={(event) => { if (previewMode) { event.preventDefault(); event.stopPropagation(); } }}
      onChangeCapture={(event) => { if (previewMode) { event.preventDefault(); event.stopPropagation(); } }}
    >
      {previewMode && <div className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950 shadow-lg">Bản xem trước học sinh · Dữ liệu minh họa, thao tác ghi và nộp bài đang khóa.</div>}
      {/* Modal xem trước tài liệu */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl flex justify-between text-white mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> Tài liệu học tập
            </h3>
            <button onClick={() => setPreviewUrl(null)} className="hover:text-rose-400 p-1">
              <X className="w-6 h-6"/>
            </button>
          </div>
          <div className="w-full max-w-5xl h-[75vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
            {isImage(previewUrl) ? (
              <Image unoptimized src={previewUrl} width={1200} height={900} className="h-full w-full object-contain bg-slate-900" alt="Tài liệu" />
            ) : (
              <iframe src={previewUrl} className="w-full h-full border-0" />
            )}
          </div>
          <a href={previewUrl} target="_blank" download className="mt-5 bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg transition-all">
            <Download className="w-5 h-5"/> Tải tài liệu về máy
          </a>
        </div>
      )}

      {/* HEADER ĐỒNG BỘ MÀU SLATE & BLUE */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/25">
                V11
              </div>
              <div>
                <span className="text-slate-900 font-black text-lg block leading-none">VẬT LÍ 11</span>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Lớp học đảo ngược</span>
              </div>
            </Link>

            {/* TAB ĐIỀU HƯỚNG CHÍNH */}
            <div className="hidden lg:flex gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 text-xs font-bold">
              <button
                onClick={() => setActiveTab('personal')} data-preview-navigation="true"
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'personal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bài cá nhân ({activities.length})
              </button>
              <button
                onClick={() => setActiveTab('group')} data-preview-navigation="true"
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'group' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bài tập Nhóm ({groupActs.length})
              </button>
              <button
                onClick={() => setActiveTab('lab')} data-preview-navigation="true"
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'lab' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Microscope className="w-3.5 h-3.5" /> Thí nghiệm ảo
              </button>
              <button
                onClick={() => setActiveTab('quizzes')} data-preview-navigation="true"
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'quizzes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trắc nghiệm ({quizzes.length})
              </button>
              <button
                onClick={() => setActiveTab('results')} data-preview-navigation="true"
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'results' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kết quả ({completedCount})
              </button>
              <button
                onClick={() => setActiveTab('chat')} data-preview-navigation="true"
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'chat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hỏi đáp
              </button>
            </div>
          </div>

          {/* Profile Học sinh */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shadow-inner">
                {getAvatar(student.full_name)}
              </div>
              <div className="hidden md:block text-right">
                <span className="font-bold text-xs text-slate-900 block leading-tight">{student.full_name}</span>
                <span className="text-[10px] text-slate-400 font-medium">Học sinh {student.class_name || "11A1"}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-4 h-4"/> Thoát
            </button>
          </div>
        </div>

        {/* Thanh điều hướng Mobile */}
        <div className="flex lg:hidden overflow-x-auto px-4 py-2 gap-1.5 border-t bg-slate-50 text-xs font-bold whitespace-nowrap">
          <button onClick={() => setActiveTab('personal')} data-preview-navigation="true" className={`px-3 py-1.5 rounded-lg ${activeTab === 'personal' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Cá nhân</button>
          <button onClick={() => setActiveTab('group')} data-preview-navigation="true" className={`px-3 py-1.5 rounded-lg ${activeTab === 'group' ? 'bg-orange-600 text-white' : 'text-slate-600'}`}>Nhóm</button>
          <button onClick={() => setActiveTab('lab')} data-preview-navigation="true" className={`px-3 py-1.5 rounded-lg ${activeTab === 'lab' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}>Thí nghiệm ảo</button>
          <button onClick={() => setActiveTab('quizzes')} data-preview-navigation="true" className={`px-3 py-1.5 rounded-lg ${activeTab === 'quizzes' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>Trắc nghiệm</button>
          <button onClick={() => setActiveTab('results')} data-preview-navigation="true" className={`px-3 py-1.5 rounded-lg ${activeTab === 'results' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Kết quả</button>
          <button onClick={() => setActiveTab('chat')} data-preview-navigation="true" className={`px-3 py-1.5 rounded-lg ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Hỏi đáp</button>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">

        {/* BANNER TIẾN ĐỘ HỌC TẬP CỦA HỌC SINH */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              <Sparkles className="w-3.5 h-3.5" /> Tiến độ bài tập cá nhân
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              Xin chào, {student.full_name}!
            </h2>
            <p className="text-xs text-slate-500">
              Em đã hoàn thành <strong>{completedCount}/{totalActCount}</strong> bài học. Hãy hoàn tất các bài tập trước giờ lên lớp nhé!
            </p>
          </div>

          <div className="flex items-center gap-6 w-full md:w-auto justify-center">
            {/* Thanh phần trăm */}
            <div className="w-44 space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Hoàn thành</span>
                <span className="text-blue-600">{completionPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            {/* Điểm trung bình */}
            <div className="px-5 py-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 text-center shrink-0">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Điểm TB</span>
              <span className="text-xl font-black text-emerald-700">{avgScore}</span>
            </div>
          </div>
        </div>

        {/* 1. TAB BÀI TẬP CÁ NHÂN */}
        {activeTab === 'personal' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Bài tập Cá nhân</h1>
                <p className="text-xs text-slate-500 mt-1">Làm bài tập chuẩn bị trước khi đến lớp đảo ngược.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((act) => {
                const dl = getDeadlineStatus(act.deadline);
                const isSubmitted = mySubmissions.some(s => s.activity_id === act.id);
                const mySub = mySubmissions.find(s => s.activity_id === act.id);
                return (
                  <div key={act.id} className="bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col hover:shadow-md transition-all overflow-hidden group">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <div className="p-6 flex-1 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="bg-blue-50 text-blue-700 font-extrabold px-3 py-1 rounded-xl text-xs border border-blue-100">
                          Bài số {act.id}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${dl.bg} ${dl.color}`}>
                          <Clock className="w-3 h-3"/> {dl.text}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {act.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {act.description || "Tự luận và bài tập rèn luyện về Tụ điện"}
                      </p>

                      {act.document_url && (
                        <button
                          onClick={() => setPreviewUrl(attachmentHref(act.document_url))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600"/> Xem tài liệu / Đề bài
                        </button>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                      {isSubmitted ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-emerald-600 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4"/>
                            {mySub?.ai_score !== null && mySub?.ai_score !== undefined
                              ? `Đã chấm: ${mySub.ai_score}/10`
                              : "Đã nộp bài"}
                          </span>
                          {!dl.isLate && (
                            <Link href={`/nop-bai?activity=${act.id}`} className="text-blue-600 text-xs font-bold hover:underline">
                              Nộp lại
                            </Link>
                          )}
                        </div>
                      ) : !dl.isLate ? (
                        <Link
                          href={`/nop-bai?activity=${act.id}`}
                          className="w-full text-center text-xs bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                        >
                          Làm & Nộp bài ngay <ChevronRight className="w-3.5 h-3.5"/>
                        </Link>
                      ) : (
                        <span className="text-rose-500 text-xs w-full text-center font-bold">
                          Đã khóa hạn nộp
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <ActivityResources activityId={null} />
          </div>
        )}

        {/* 2. TAB BÀI TẬP NHÓM */}
        {activeTab === 'group' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-7 h-7 text-orange-600"/> Bài tập Nhóm
              </h1>
              <p className="text-xs text-slate-500 mt-1">Cùng thảo luận với các thành viên trong nhóm và nộp bài báo cáo.</p>
            </div>

            {groupActs.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl text-center text-slate-400 text-sm">
                Chưa có bài tập nhóm nào được giao.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupActs.map(gAct => {
                  const dl = getDeadlineStatus(gAct.deadline);
                  const isSubmitted = myGroupSubs.some(s => s.assignment_id === gAct.id);
                  return (
                    <div key={gAct.id} className="bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col hover:shadow-md transition-all overflow-hidden group">
                      <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-amber-500"></div>
                      <div className="p-6 flex-1 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="bg-orange-50 text-orange-700 font-extrabold px-3 py-1 rounded-xl text-xs border border-orange-100 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5"/> Nhiệm vụ nhóm
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${dl.bg} ${dl.color}`}>
                            <Clock className="w-3 h-3"/> {dl.text}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                          {gAct.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {gAct.description || "Nhiệm vụ nghiên cứu và thuyết trình nhóm"}
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                        {isSubmitted ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-emerald-600 text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4"/> Nhóm đã nộp bài
                            </span>
                            {!dl.isLate && (
                              <Link href={`/phieu-nhom?assignment=${gAct.id}`} className="text-orange-600 text-xs font-bold hover:underline">
                                Xem / Nộp lại
                              </Link>
                            )}
                          </div>
                        ) : !dl.isLate ? (
                          <Link
                            href={`/phieu-nhom?assignment=${gAct.id}`}
                            className="w-full text-center text-xs bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-orange-500/20"
                          >
                            Vào nộp bài nhóm <ChevronRight className="w-3.5 h-3.5"/>
                          </Link>
                        ) : (
                          <span className="text-rose-500 text-xs w-full text-center font-bold">
                            Đã khóa hạn nộp
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. TAB PHÒNG THÍ NGHIỆM ẢO TƯƠNG TÁC (VIRTUAL LAB) */}
        {activeTab === 'lab' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Microscope className="w-8 h-8 text-purple-600"/> Phòng Thí Nghiệm Ảo Tụ Điện
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Khảo sát mối quan hệ giữa điện tích Q và điện áp U, đo điện dung thực nghiệm C = (ε₀ · εr · S) / d và vẽ đường hồi quy.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm">
              <VirtualLab />
            </div>
          </div>
        )}

        {/* 4. TAB TRẮC NGHIỆM */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Bài tập Trắc nghiệm Tự luyện</h1>
              <p className="text-xs text-slate-500 mt-1">Luyện tập câu hỏi trắc nghiệm khách quan có tính giờ và giải thích chi tiết.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {quizzes.map(qz => (
                <div key={qz.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-base text-slate-900">{qz.title}</h3>
                      <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Clock className="w-3 h-3"/> {qz.time_limit} phút
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Gắn với bài học số {qz.activity_id}</p>
                  </div>
                  <Link
                    href={`/lam-bai?quiz=${qz.id}`}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs text-center shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    Bắt đầu làm bài thi <ChevronRight className="w-4 h-4"/>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. TAB KẾT QUẢ BÀI LÀM */}
        {activeTab === 'results' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                <Trophy className="w-8 h-8 text-emerald-600"/> Kết quả & Góp ý từ Giáo viên
              </h1>
              <p className="text-xs text-slate-500 mt-1">Xem lại điểm số, nhận xét chi tiết của AI và đáp án mẫu.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 md:p-8 space-y-4">
              <h2 className="font-bold text-base text-slate-900">Bài cá nhân đã nộp ({mySubmissions.length})</h2>
              {mySubmissions.length === 0 ? (
                <p className="text-slate-400 text-center py-10 text-xs">Em chưa nộp bài tập cá nhân nào.</p>
              ) : (
                <div className="space-y-3">
                  {mySubmissions.map(sub => {
                    const act = activities.find(a => a.id === sub.activity_id);
                    const isGraded = sub.ai_score !== null && sub.ai_score !== undefined;
                    return (
                      <div key={sub.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{act ? act.title : `Bài ${sub.activity_id}`}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Nộp lúc: {formatTime(sub.submitted_at)}</p>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            isGraded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isGraded ? `Điểm AI: ${sub.ai_score}/10` : 'Đang chờ chấm'}
                          </span>
                        </div>

                        {sub.answer && (
                          <div className="bg-white p-3 rounded-xl text-xs text-slate-700 border border-slate-100 leading-relaxed whitespace-pre-line">
                            {sub.answer}
                          </div>
                        )}

                        {isGraded && (
                          <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl space-y-1.5 text-xs">
                            <p className="text-slate-800"><span className="font-bold text-indigo-950">Nhận xét:</span> {sub.ai_feedback}</p>
                            {sub.ai_strengths && <p className="text-emerald-700"><span className="font-bold">Điểm mạnh:</span> {sub.ai_strengths}</p>}
                            {sub.ai_weaknesses && <p className="text-amber-700"><span className="font-bold">Cần lưu ý:</span> {sub.ai_weaknesses}</p>}
                            {sub.ai_model_answer && (
                              <div className="bg-white/90 p-3 rounded-lg border border-indigo-100 text-slate-800 mt-2">
                                <span className="font-bold text-indigo-900 block mb-0.5">Đáp án mẫu:</span>
                                {sub.ai_model_answer}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. TAB HỎI ĐÁP & CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-[75vh] flex flex-col max-w-4xl mx-auto overflow-hidden animate-in fade-in">
            <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-sm">Kênh hỏi đáp môn Vật lí 11</h2>
                <p className="text-[11px] text-slate-400">Trao đổi với Cô giáo và các bạn trong lớp</p>
              </div>
              {isChatMuted && <span className="text-xs bg-rose-500 px-2.5 py-1 rounded-full font-bold">Giáo viên đã khóa chat</span>}
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map(m => {
                const isMe = m.sender_name === student.full_name;
                const isTeacher = m.sender_name?.includes('Cô') || m.sender_name?.includes('Giáo viên');
                return (
                  <div key={m.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                      isTeacher ? 'bg-indigo-600' : isMe ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}>
                      {getAvatar(m.sender_name)}
                    </div>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isMe ? 'bg-blue-600 text-white' : isTeacher ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium' : 'bg-white border text-slate-800'
                      }`}>
                        <p>{m.content}</p>
                        {isMe && <button onClick={() => void deleteOwnMessage(m)} className="mt-2 text-[10px] opacity-70 hover:opacity-100">Xóa tin nhắn</button>}
                        {m.attachment_url && (m.attachment_type?.startsWith("image/") ? <a href={attachmentHref(m.attachment_url)} target="_blank" rel="noreferrer"><Image unoptimized width={800} height={600} src={attachmentHref(m.attachment_url)} alt={m.attachment_name || "Ảnh đính kèm"} className="mt-2 max-h-64 rounded-xl object-contain" /></a> : <a href={attachmentHref(m.attachment_url)} target="_blank" rel="noreferrer" className="mt-2 block underline">📎 {m.attachment_name || "Tải tệp"}</a>)}
                        <button onClick={() => speakText(m.content)} className={`mt-1.5 ${isMe ? 'text-blue-200 hover:text-white' : 'text-slate-400 hover:text-blue-600'}`} title="Nghe đọc giọng nói">
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {m.sender_name} • {formatTime(m.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
              <input type="file" onChange={(e) => setChatFile(e.target.files?.[0] || null)} className="max-w-28 text-[10px]" aria-label="Đính kèm tệp hoặc ảnh" />{chatFile && <button type="button" onClick={() => setChatFile(null)} className="max-w-24 truncate text-[10px]">{chatFile.name} ×</button>}<input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder={isChatMuted ? "Giáo viên tạm khóa chat..." : "Nhập câu hỏi hoặc trao đổi cùng lớp..."}
                disabled={isChatMuted}
                className="flex-1 border p-3 rounded-xl text-xs outline-none bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={isChatMuted || isSendingChat || (!newMsg.trim() && !chatFile)}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="w-4 h-4"/> Gửi
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
