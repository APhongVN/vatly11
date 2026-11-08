"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { CHAT_ATTACHMENT_ACCEPT, chatAttachmentMimeType, isInlineChatImage, MAX_CHAT_ATTACHMENT_BYTES } from "@/lib/chat-attachments.mjs";
import {
  BookOpen, Clock, FileText, Download, MessageSquare, Send,
  ChevronRight, Lock, X, LogOut, ArrowLeft, CheckCircle2,
  Volume2, Users, Trophy, Target, Sparkles, Microscope,
  Award, TrendingUp, HelpCircle, ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import VirtualLab from "@/components/VirtualLab";
import { filterSubmissionsForStudentGroups } from "@/lib/group-submissions.mjs";
import { isMessageFromUser } from "@/lib/chat-identity.mjs";
import ActivityResources from "@/components/ActivityResources";
import StudentPortalPreview from "@/components/StudentPortalPreview";
import { QUESTION_TOPICS } from "@/lib/student-questions.mjs";

const attachmentHref = (value: string) => value.startsWith("http") || value.startsWith("blob:") ? value : `/api/files?bucket=${value.startsWith("chat/") || value.startsWith("submissions/") || value.startsWith("group-submissions/") || value.startsWith("group-rubrics/") ? "class-work" : "videos"}&path=${encodeURIComponent(value)}`;

export default function HocSinhPage() {
  const [student, setStudent] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [groupActs, setGroupActs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [myGroupSubs, setMyGroupSubs] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [myQuizSubs, setMyQuizSubs] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [now, setNow] = useState(new Date());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [isDeletionBlocked, setIsDeletionBlocked] = useState(false);
  const [myQuestions, setMyQuestions] = useState<any[]>([]);
  const [myEvidence, setMyEvidence] = useState<any[]>([]);
  const [newQuestionTopic, setNewQuestionTopic] = useState("");
  const [newQuestionContent, setNewQuestionContent] = useState("");
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [questionLink, setQuestionLink] = useState("");
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const loadIdentity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Guests can explore published lessons without a fake student profile.
        return;
      }
      const { data: accountProfile, error: accountProfileError } = await supabase.from("profiles").select("role,must_change_password").eq("id", user.id).maybeSingle();
      if (accountProfileError) { await supabase.auth.signOut(); router.replace("/login?error=role"); return; }
      if (accountProfile?.role !== "student") { router.replace(accountProfile?.role === "teacher" ? "/giao-vien" : "/login?error=role"); return; }
      if (accountProfile.must_change_password) { router.replace("/doi-mat-khau"); return; }
      const { data: profile } = await supabase.from('students').select('id,full_name,class_name').eq('auth_user_id', user.id).maybeSingle();
      if (!profile) { router.replace('/login?error=student-profile'); return; }
      if (cancelled) return;
      const authenticatedStudent = { ...profile, auth_user_id: user.id };
      localStorage.setItem('student_session', JSON.stringify(authenticatedStudent));
      setStudent(authenticatedStudent);
      fetchData(authenticatedStudent);
    };
    void loadIdentity();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!student) return;
    const refreshChat = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(300);
      if (data) setMessages([...data].reverse());
    };
    const channel = supabase.channel("class-chat-student")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void refreshChat())
      .subscribe();
    const timer = window.setInterval(() => void refreshChat(), 30000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [student]);
  useEffect(() => {
    if (!student) return;
    // Mục 7: cập nhật trạng thái hoạt động để giáo viên biết online/offline.
    const ping = () => { void fetch("/api/presence", { method: "POST" }).catch(() => undefined); };
    ping();
    const timer = window.setInterval(ping, 120000);
    return () => window.clearInterval(timer);
  }, [student]);

  async function fetchData(student: any) {
    if (!student) return;
    const { data: acts } = await supabase.from('activities').select('*').order('id');
    if (acts) setActivities(acts);

    const { data: gActs } = await supabase.from('group_assignments').select('*').is('archived_at', null).order('created_at', { ascending: false });
    if (gActs) setGroupActs(gActs);

    const { data: msgs } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(300);
    if (msgs) setMessages([...msgs].reverse());

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

    const { data: qzs } = await supabase.from('quizzes').select('*').is('archived_at', null).order('id');
    if (qzs) setQuizzes(qzs);
    const { data: myQzSubs } = await supabase.from('quiz_submissions').select('quiz_id,score,created_at').eq('student_id', student.id);
    if (myQzSubs) setMyQuizSubs(myQzSubs);
    const { data: ev } = await supabase.from('activity_evidence').select('activity_id,score,score_max,completed_at,first_attempt_correct,correct_after_hint,attempts_count,hint_count,review_topics').eq('student_id', student.id).order('updated_at', { ascending: false });
    if (ev) setMyEvidence(ev);
    const { data: setting } = await supabase.from('chat_settings').select('is_muted,deletion_blocked').eq('id', 1).single();
    if (setting) { setIsChatMuted(setting.is_muted); setIsDeletionBlocked(Boolean((setting as any).deletion_blocked)); }
    await fetchMyQuestions();
  }

  const fetchMyQuestions = async () => {
    try {
      const response = await fetch("/api/student-questions", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      setMyQuestions(Array.isArray(result.questions) ? result.questions : []);
    } catch {
      // Góc hỏi đáp là phần phụ; lỗi tải không nên chặn phần học tập chính.
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questionSubmitting) return;
    if (!newQuestionTopic) { alert("Em hãy chọn một chủ đề cho câu hỏi."); return; }
    if (newQuestionContent.trim().length < 5) { alert("Câu hỏi cần dài tối thiểu 5 ký tự."); return; }
    if (questionFile && questionLink.trim()) { alert("Em chỉ đính kèm một tệp hoặc một liên kết."); return; }
    setQuestionSubmitting(true);
    try {
      let attachmentPath = "";
      let attachmentName = "";
      if (questionFile) {
        if (questionFile.size > MAX_CHAT_ATTACHMENT_BYTES) throw new Error("Tệp đính kèm tối đa 100 MB.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập hết hạn. Em hãy đăng nhập lại.");
        const contentType = chatAttachmentMimeType(questionFile);
        const safeName = questionFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `question-attachments/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("class-work").upload(path, questionFile, { upsert: false, contentType });
        if (uploadError) throw uploadError;
        attachmentPath = path;
        attachmentName = questionFile.name;
      }
      const response = await fetch("/api/student-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: newQuestionTopic,
          content: newQuestionContent,
          attachmentPath,
          attachmentUrl: questionLink.trim(),
          attachmentName,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (attachmentPath) await supabase.storage.from("class-work").remove([attachmentPath]);
        throw new Error(result.error || "Không gửi được câu hỏi.");
      }
      setNewQuestionTopic("");
      setNewQuestionContent("");
      setQuestionFile(null);
      setQuestionLink("");
      await fetchMyQuestions();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không gửi được câu hỏi.");
    } finally {
      setQuestionSubmitting(false);
    }
  };

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
        if (chatFile.size > MAX_CHAT_ATTACHMENT_BYTES) throw new Error("Tệp chat tối đa 25 MB.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập hết hạn. Em hãy đăng nhập lại.");
        const contentType = chatAttachmentMimeType(chatFile);
        const safeName = chatFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `chat/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("class-work").upload(path, chatFile, { upsert: false, contentType });
        if (uploadError) throw uploadError;
        attachment = { attachment_url: path, attachment_name: chatFile.name, attachment_type: contentType };
      }
      const { error } = await supabase.from("messages").insert([{ sender_name: student.full_name, content: newMsg.trim(), ...attachment }]);
      if (error) throw error;
      setNewMsg(""); setChatFile(null); await fetchData(student);
    } catch (error) { alert(error instanceof Error ? error.message : "Không gửi được tin nhắn."); }
    finally { setIsSendingChat(false); }
  };
  const deleteOwnMessage = async (message: any) => {
    if (!isMessageFromUser(message, student?.auth_user_id)) return;
    if (!confirm("Xóa tin nhắn của em?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) { alert("Không xóa được tin nhắn: " + error.message); return; }
    setMessages((current) => current.filter((item) => item.id !== message.id));
    if (message.attachment_url && !message.attachment_url.startsWith("http")) {
      const { error: fileError } = await supabase.storage.from("class-work").remove([message.attachment_url]);
      if (fileError) alert("Tin nhắn đã xóa, nhưng chưa dọn được tệp đính kèm: " + fileError.message);
    }
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

  if (!student) return <StudentPortalPreview />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 flex flex-col relative">
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
                  activeTab === 'lab' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
                <span className="text-[10px] text-slate-400 font-medium">Học sinh {student.class_name || "Chưa xếp lớp"}</span>
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
          <button onClick={() => setActiveTab('lab')} data-preview-navigation="true" className={`px-3 py-1.5 rounded-lg ${activeTab === 'lab' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Thí nghiệm ảo</button>
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
            <div className="px-5 py-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-50 border border-emerald-100 text-center shrink-0">
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
                        {gAct.rubric_document_path && (
                          <a href={attachmentHref(gAct.rubric_document_path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-100">
                            <Download className="h-4 w-4" /> Tải file ma trận chấm điểm
                          </a>
                        )}
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
                  <Microscope className="w-8 h-8 text-indigo-600"/> Phòng Thí Nghiệm Ảo Tụ Điện
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

            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Mỗi bài trắc nghiệm chỉ được làm <strong>duy nhất 1 lần</strong>. Em hãy chắc chắn đã sẵn sàng trước khi bấm bắt đầu và không thoát ra giữa buổi làm bài.
            </p>

            {(() => {
              const doneIds = new Set(myQuizSubs.map((s) => String(s.quiz_id)));
              const pending = quizzes.filter((qz) => !doneIds.has(String(qz.id)));
              const done = quizzes.filter((qz) => doneIds.has(String(qz.id)));
              return (
                <div className="space-y-8">
                  <section>
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <Target className="w-4 h-4 text-emerald-600" /> Chưa làm ({pending.length})
                    </h2>
                    {pending.length === 0 ? (
                      <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">Em đã hoàn thành toàn bộ bài trắc nghiệm. Tuyệt vời!</p>
                    ) : (
                      <div className="mt-3 grid md:grid-cols-2 gap-5">
                        {pending.map((qz) => (
                          <div key={qz.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <h3 className="font-bold text-base text-slate-900">{qz.title}</h3>
                                <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                  <Clock className="w-3 h-3"/> {qz.time_limit} phút
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">Gắn với bài học số {qz.activity_id}</p>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">Chỉ làm 1 lần</span>
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
                    )}
                  </section>

                  <section>
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" /> Đã làm ({done.length})
                    </h2>
                    {done.length === 0 ? (
                      <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-400">Chưa có bài nào được nộp.</p>
                    ) : (
                      <div className="mt-3 grid md:grid-cols-2 gap-5">
                        {done.map((qz) => {
                          const sub = myQuizSubs.find((s) => String(s.quiz_id) === String(qz.id));
                          return (
                            <div key={qz.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-base text-slate-900">{qz.title}</h3>
                                  <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                    <Trophy className="w-3 h-3"/> {sub?.score ?? "—"} / 10
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">Nộp lúc {sub?.created_at ? new Date(sub.created_at).toLocaleString("vi-VN") : "—"}</p>
                              </div>
                              <Link
                                href={`/lam-bai?quiz=${qz.id}`}
                                className="w-full border border-slate-300 text-slate-600 py-2.5 rounded-xl font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5 cursor-not-allowed"
                                title="Bài trắc nghiệm chỉ được làm 1 lần"
                              >
                                <Lock className="w-3.5 h-3.5"/> Đã nộp — xem lại kết quả
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              );
            })()}
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

            {/* 4.8 Kết quả học tập: 4 chỉ số theo dõi từ dữ liệu thật */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 md:p-8 space-y-4">
              <h2 className="font-bold text-base text-slate-900">Kết quả học tập của em</h2>
              {myEvidence.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-xs">Chưa có dữ liệu. Các chỉ số sẽ được cập nhật sau khi em hoàn thành hoạt động trắc nghiệm.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(() => {
                    const answeredTotal = myEvidence.filter((record) => record.completed_at).length;
                    const firstAttemptCorrect = myEvidence.filter((record) => record.first_attempt_correct === true).length;
                    const correctAfterHint = myEvidence.filter((record) => record.correct_after_hint === true).length;
                    const totalHints = myEvidence.reduce((sum, record) => sum + (Number(record.hint_count) || 0), 0);
                    const cards = [
                      { label: "Số hoạt động đã làm", value: answeredTotal, tone: "text-blue-700" },
                      { label: "Đúng ngay lần đầu", value: firstAttemptCorrect, tone: "text-emerald-700" },
                      { label: "Đúng sau khi dùng gợi ý", value: correctAfterHint, tone: "text-indigo-700" },
                      { label: "Số lần dùng gợi ý", value: totalHints, tone: "text-amber-700" },
                    ];
                    return cards.map((card) => (
                      <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-center">
                        <p className={`text-2xl font-black tabular-nums ${card.tone}`}>{card.value}</p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-600">{card.label}</p>
                      </div>
                    ));
                  })()}
                </div>
              )}
              <p className="text-[10px] text-slate-400">Các chỉ số chỉ đếm từ dữ liệu thật do website ghi nhận; không hiển thị số liệu mẫu.</p>
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
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">

            {/* --- GÓC HỎI ĐÁP: CÂU HỎI CỦA TÔI --- */}
            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-indigo-50">
                <h2 className="font-bold text-sm text-indigo-900 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> Góc hỏi đáp · Câu hỏi của tôi ({myQuestions.length})
                </h2>
                <p className="text-[11px] text-indigo-700/80 mt-0.5">Chọn chủ đề, gửi câu hỏi và theo dõi trạng thái xử lý của giáo viên.</p>
              </div>

              <form onSubmit={handleQuestionSubmit} className="p-4 border-b bg-slate-50/60 space-y-2">
                <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                  <select
                    value={newQuestionTopic}
                    onChange={(e) => setNewQuestionTopic(e.target.value)}
                    aria-label="Chủ đề câu hỏi"
                    className="border border-slate-300 rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">— Chọn chủ đề —</option>
                    {QUESTION_TOPICS.map((topic: { id: string; label: string }) => (
                      <option key={topic.id} value={topic.id}>{topic.label}</option>
                    ))}
                  </select>
                  <textarea
                    value={newQuestionContent}
                    onChange={(e) => setNewQuestionContent(e.target.value)}
                    rows={2}
                    maxLength={1500}
                    placeholder="Nhập câu hỏi của em về bài Tụ điện…"
                    aria-label="Nội dung câu hỏi"
                    className="border border-slate-300 rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-[10px] font-semibold text-slate-600">Đính kèm ảnh/video/tài liệu (tối đa 100 MB)
                    <input
                      type="file"
                      accept={CHAT_ATTACHMENT_ACCEPT}
                      onChange={(e) => { setQuestionFile(e.target.files?.[0] || null); if (e.target.files?.[0]) setQuestionLink(""); }}
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-1.5 text-[10px]"
                    />
                    {questionFile ? <span className="mt-1 block text-[10px] text-indigo-700">Đã chọn: {questionFile.name} <button type="button" onClick={() => setQuestionFile(null)} className="ml-1 font-bold text-rose-600">×</button></span> : null}
                  </label>
                  <label className="text-[10px] font-semibold text-slate-600">Hoặc dán liên kết (Google Drive, YouTube…)
                    <input
                      type="url"
                      value={questionLink}
                      onChange={(e) => { setQuestionLink(e.target.value); if (e.target.value.trim()) setQuestionFile(null); }}
                      placeholder="https://…"
                      className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-[11px]"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-400">{newQuestionContent.trim().length}/1500 ký tự</span>
                  <button
                    type="submit"
                    disabled={questionSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> {questionSubmitting ? "Đang gửi…" : "Gửi câu hỏi"}
                  </button>
                </div>
              </form>

              <div className="p-4 space-y-3 max-h-80 overflow-y-auto bg-white">
                {myQuestions.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Em chưa gửi câu hỏi nào. Câu hỏi sẽ được lưu và giáo viên phản hồi tại đây.</p>
                ) : (
                  myQuestions.map((q) => {
                    const statusMeta =
                      q.status === "resolved"
                        ? { label: "Đã giải quyết", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" }
                        : q.status === "answered"
                        ? { label: "Đã trả lời", cls: "bg-blue-100 text-blue-800 border-blue-200" }
                        : { label: "Chưa trả lời", cls: "bg-amber-100 text-amber-800 border-amber-200" };
                    const topicLabel = QUESTION_TOPICS.find((t: { id: string }) => t.id === q.topic)?.label || q.topic;
                    return (
                      <article key={q.id} className="border border-slate-200 rounded-2xl p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">{topicLabel}</span>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.cls}`}>{statusMeta.label}</span>
                        </div>
                        <p className="text-xs text-slate-800 whitespace-pre-line break-words">{q.content}</p>
                        {q.attachment_path ? (
                          <a href={attachmentHref(q.attachment_path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 underline">📎 {q.attachment_name || "Tệp đính kèm"}</a>
                        ) : q.attachment_url ? (
                          <a href={q.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 underline">🔗 Liên kết đính kèm</a>
                        ) : null}
                        <p className="text-[10px] text-slate-400">Gửi lúc: {formatTime(q.created_at)}</p>
                        {q.teacher_response ? (
                          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-2.5 text-xs text-indigo-950 whitespace-pre-line">
                            <span className="font-bold block mb-0.5">Phản hồi của giáo viên:</span>
                            {q.teacher_response}
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            {/* --- KÊNH CHAT LỚP --- */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-[65vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-sm">Kênh hỏi đáp môn Vật lí 11</h2>
                <p className="text-[11px] text-slate-400">Trao đổi với Cô giáo và các bạn trong lớp</p>
              </div>
              {isChatMuted && <span className="text-xs bg-rose-500 px-2.5 py-1 rounded-full font-bold">Giáo viên đã khóa chat</span>}
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map(m => {
                const isMe = isMessageFromUser(m, student.auth_user_id);
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
                        {isMe && !isDeletionBlocked && <button onClick={() => void deleteOwnMessage(m)} className="mt-2 text-[10px] opacity-70 hover:opacity-100">Xóa tin nhắn</button>}
                        {isMe && isDeletionBlocked && <span className="mt-2 block text-[10px] text-slate-400">Giáo viên đang khóa xóa tin nhắn</span>}
                        {m.attachment_url && (isInlineChatImage(m.attachment_type) ? <a href={attachmentHref(m.attachment_url)} target="_blank" rel="noreferrer"><Image unoptimized width={800} height={600} src={attachmentHref(m.attachment_url)} alt={m.attachment_name || "Ảnh đính kèm"} className="mt-2 max-h-64 rounded-xl object-contain" /></a> : <a href={attachmentHref(m.attachment_url)} target="_blank" rel="noreferrer" className="mt-2 block underline">📎 {m.attachment_name || "Tải tệp"}</a>)}
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
              <input type="file" accept={CHAT_ATTACHMENT_ACCEPT} onChange={(e) => setChatFile(e.target.files?.[0] || null)} className="max-w-28 text-[10px]" aria-label="Đính kèm tệp hoặc ảnh" />{chatFile && <button type="button" onClick={() => setChatFile(null)} className="max-w-24 truncate text-[10px]">{chatFile.name} ×</button>}<input
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
            </div>
        )}
      </div>
    </main>
  );
}
