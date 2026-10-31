"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen, Calendar, MessageSquare, Users, Loader2,
  CheckCircle2, Clock, Sparkles, Layers, FileText, ArrowRight,
  TrendingUp, Award, Camera, PlusCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TeacherHomeProps {
  onNavigateTab?: (tab: string) => void;
  previewMode?: boolean;
}

export default function TeacherHome({ onNavigateTab, previewMode = false }: TeacherHomeProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    pendingGrading: 0,
    totalStudents: 0,
    activeChats: 0,
    groupAssignments: 0,
    gradedCount: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);

  const fetchTeacherDashboardData = useCallback(async () => {
    if (previewMode) {
      setStats({ totalAssignments: 14, pendingGrading: 3, totalStudents: 28, activeChats: 12, groupAssignments: 2, gradedCount: 19 });
      setRecentSubmissions([
        { id: "demo-1", student_name: "Nguyễn Minh Anh", activity_id: 4, status: "pending", submitted_at: new Date().toISOString() },
        { id: "demo-2", student_name: "Trần Gia Bảo", activity_id: 8, status: "graded", submitted_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { count: totalAssignments } = await supabase.from('activities').select('*', { count: 'exact', head: true });
      const { count: pendingGrading } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: gradedCount } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'graded');
      const { count: totalStudents } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const { count: activeChats } = await supabase.from('messages').select('*', { count: 'exact', head: true });
      const { count: groupAssignments } = await supabase.from('group_assignments').select('*', { count: 'exact', head: true });

      const { data: recents } = await supabase
        .from('submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(5);

      setStats({
        totalAssignments: totalAssignments || 0,
        pendingGrading: pendingGrading || 0,
        gradedCount: gradedCount || 0,
        totalStudents: totalStudents || 0,
        activeChats: activeChats || 0,
        groupAssignments: groupAssignments || 0,
      });

      if (recents) setRecentSubmissions(recents);
    } catch (error) {
      console.error("Lỗi tải dashboard giáo viên:", error);
    } finally {
      setLoading(false);
    }
  }, [previewMode]);

  useEffect(() => { void fetchTeacherDashboardData(); }, [fetchTeacherDashboardData]);

  const nav = (tab: string) => {
    if (onNavigateTab) onNavigateTab(tab);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Hệ thống Quản trị Lớp học Đảo ngược
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Chào mừng Cô giáo đến với Trung tâm Quản trị!
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed mb-6">
            Theo dõi tiến độ học tập, giao nhiệm vụ cá nhân/nhóm, cập nhật ma trận chấm điểm và kích hoạt AI chấm bài thông minh.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => nav('create_activity')}
              className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Tạo bài tập mới
            </button>
            <button
              onClick={() => nav('grading')}
              className="px-5 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white border border-blue-400/40 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Chấm bài học sinh ({stats.pendingGrading})
            </button>
          </div>
        </div>
      </div>

      {/* Grid thống kê 4 ô chính */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div
          onClick={() => nav('activities')}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              {stats.groupAssignments} bài nhóm
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bài học cá nhân</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalAssignments}</p>
        </div>

        <div
          onClick={() => nav('grading')}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Đã chấm {stats.gradedCount}
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chờ chấm điểm</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats.pendingGrading}</p>
        </div>

        <div
          onClick={() => nav('students')}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
              Lớp 11A1
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng sinh viên</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.totalStudents}</p>
        </div>

        <div
          onClick={() => nav('chat')}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Trực tuyến
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tin nhắn thảo luận</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.activeChats}</p>
        </div>
      </div>

      {/* Hành động nhanh & Bài nộp gần đây */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Phím tắt tác vụ */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" /> Thao tác nhanh
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => nav('create_activity')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 text-left flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Tạo bài tập mới</p>
                  <p className="text-[11px] text-slate-500">Soạn bài tập cá nhân, tải tài liệu & ma trận điểm</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </button>

            <button
              onClick={() => nav('group_assignments')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border border-slate-100 text-left flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Quản lý Bài tập nhóm</p>
                  <p className="text-[11px] text-slate-500">Chia nhóm tự động, đính kèm đề tài & tài liệu</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600 transition-colors" />
            </button>

            <button
              onClick={() => nav('ocr')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-100 text-left flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Chấm bài từ ảnh (AI OCR)</p>
                  <p className="text-[11px] text-slate-500">Quét ảnh chụp bài thi & chấm điểm tự động</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
            </button>

            <button
              onClick={() => nav('quizzes')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-100 text-left flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Tạo bài trắc nghiệm nhanh</p>
                  <p className="text-[11px] text-slate-500">Tạo ngân hàng câu hỏi có tính giờ làm bài</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Bài nộp mới nhất */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Bài làm học sinh nộp gần đây
            </h2>
            <button
              onClick={() => nav('grading')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Xem tất cả ({stats.pendingGrading + stats.gradedCount})
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Chưa có bài nộp nào từ học sinh.
              </div>
            ) : (
              recentSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {sub.student_name ? sub.student_name.split(' ').pop()?.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">{sub.student_name}</p>
                      <p className="text-[11px] text-slate-400">
                        Bài số {sub.activity_id} • {new Date(sub.submitted_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, {new Date(sub.submitted_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {sub.ai_score !== null && sub.ai_score !== undefined ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        {sub.ai_score}/10
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                        Chờ chấm
                      </span>
                    )}
                    <button
                      onClick={() => nav('grading')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
