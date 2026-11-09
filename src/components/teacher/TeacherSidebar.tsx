"use client";
import Link from "next/link";
import {
  Home, BrainCircuit, Video, BookOpen, FolderOpen, PlusCircle, Layers, Archive,
  FileText, ClipboardList, Camera, RefreshCw, Users, Sparkles, MessageSquare,
  HelpCircle, ExternalLink, LogOut, Menu, X,
} from "lucide-react";

export type TeacherNavItem = { tab: string; label: string; icon: React.ReactNode };

/**
 * Sidebar điều hướng của cổng giáo viên, tách riêng khỏi dashboard để dễ bảo trì.
 */
export default function TeacherSidebar({
  activeTab,
  navigateToTab,
  onOpenTrash,
  counts,
  previewMode,
  onLogout,
  mobileNavOpen,
  setMobileNavOpen,
  classSummary = "Quản lý lớp học",
  teacherName = "Giáo viên",
}: {
  activeTab: string;
  navigateToTab: (tab: string) => void;
  onOpenTrash: () => void;
  counts: { activities: number; groups: number; messages: number; pendingQuestions: number; regrade: number; students: number };
  previewMode: boolean;
  onLogout: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  classSummary?: string;
  teacherName?: string;
}) {
  const sections: Array<{ title: string; items: TeacherNavItem[] }> = [
    {
      title: "Tổng quan",
      items: [
        { tab: "home", label: "Trang chủ Bảng điều khiển", icon: <Home className="w-4 h-4 text-blue-400" /> },
        { tab: "analytics", label: "AI Phân tích & Báo cáo", icon: <BrainCircuit className="w-4 h-4 text-emerald-400" /> },
      ],
    },
    {
      title: "Quản lý Bài tập",
      items: [
        { tab: "activities", label: `Bài học cá nhân (${counts.activities})`, icon: <Video className="w-4 h-4 text-blue-400" /> },
        { tab: "curriculum", label: "Lộ trình môn & chương", icon: <BookOpen className="w-4 h-4 text-indigo-400" /> },
        { tab: "resources", label: "Kho học liệu", icon: <FolderOpen className="w-4 h-4 text-emerald-400" /> },
        { tab: "create_activity", label: "Tạo bài tập mới", icon: <PlusCircle className="w-4 h-4 text-emerald-400" /> },
        { tab: "group_assignments", label: `Bài tập Nhóm (${counts.groups})`, icon: <Layers className="w-4 h-4 text-orange-400" /> },
      ],
    },
    {
      title: "Chấm điểm & AI",
      items: [
        { tab: "grading", label: "Chấm điểm cá nhân", icon: <FileText className="w-4 h-4 text-blue-400" /> },
        { tab: "activity-evidence", label: "Sổ tay & bằng chứng", icon: <ClipboardList className="w-4 h-4 text-indigo-400" /> },
        { tab: "ocr", label: "Chấm từ ảnh (AI OCR)", icon: <Camera className="w-4 h-4 text-indigo-400" /> },
        { tab: "regrade", label: `Chấm lại bài lỗi (${counts.regrade})`, icon: <RefreshCw className="w-4 h-4 text-amber-400" /> },
      ],
    },
    {
      title: "Lớp học",
      items: [
        { tab: "students", label: `Danh sách sinh viên (${counts.students})`, icon: <Users className="w-4 h-4 text-emerald-400" /> },
        { tab: "quizzes", label: "Tạo Trắc nghiệm & AI Sinh Đề", icon: <Sparkles className="w-4 h-4 text-indigo-400" /> },
        { tab: "chat", label: `Kênh thảo luận (${counts.messages})`, icon: <MessageSquare className="w-4 h-4 text-blue-400" /> },
        { tab: "student_questions", label: `Góc hỏi đáp (${counts.pendingQuestions})`, icon: <HelpCircle className="w-4 h-4 text-indigo-400" /> },
      ],
    },
  ];

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <button type="button" aria-label={mobileNavOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"} aria-expanded={mobileNavOpen} aria-controls="teacher-navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100">
          {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs font-black tracking-wide text-slate-900">GIÁO VIÊN PORTAL</p>
          <p className="truncate text-[10px] text-slate-500">{classSummary} · Điều hướng nhanh</p>
        </div>
      </div>
      {mobileNavOpen && <button type="button" aria-label="Đóng menu điều hướng" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
      <aside id="teacher-navigation" className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 transform flex-col border-r border-slate-800 bg-slate-900 text-slate-300 shadow-2xl transition-transform duration-300 motion-reduce:transition-none ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} lg:sticky lg:top-0 lg:h-screen lg:z-20 lg:translate-x-0 lg:transition-none`}>
<div className="p-6 border-b border-slate-800 bg-gradient-to-r from-blue-900/60 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/30">V11</div>
            <div>
              <h1 className="text-base font-extrabold tracking-wide text-white">GIÁO VIÊN PORTAL</h1>
              <p className="text-[11px] text-blue-200">{teacherName} • {classSummary}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto text-xs font-semibold" aria-label="Điều hướng giáo viên">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{section.title}</p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => navigateToTab(item.tab)}
                    aria-current={activeTab === item.tab ? "page" : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${activeTab === item.tab ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold" : "hover:bg-slate-800 text-slate-300"}`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {/* Thùng rác luôn hiện ở cuối menu để cô không phải tìm theo tab */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Công cụ</p>
            <button type="button" onClick={onOpenTrash} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all hover:bg-slate-800 text-slate-300">
              <Archive className="w-4 h-4 text-slate-400" /> Thùng rác (khôi phục)
            </button>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-1 text-xs font-semibold">
          <Link href="/chapters" className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
            <ExternalLink className="w-4 h-4" /> Xem chương học công khai
          </Link>
          <Link href="/" className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
            <Home className="w-4 h-4" /> Về Trang chủ Website
          </Link>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:text-white hover:bg-rose-600/40 rounded-xl transition-all">
            {previewMode ? <Home className="w-4 h-4" /> : <LogOut className="w-4 h-4" />} {previewMode ? "Về trang chủ" : "Đăng xuất"}
          </button>
        </div>
      </aside>
    </>
  );
}