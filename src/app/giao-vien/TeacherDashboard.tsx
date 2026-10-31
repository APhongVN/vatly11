"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import {
  LogOut, Home, Video, Users, FileText, Bot, Upload, MessageSquare,
  Send, Calendar, Download, CheckCircle, Trash2, ArrowLeft, Search,
  Save, X, Plus, Clock, Layers, BookOpen, Shuffle, RefreshCw, Camera,
  Sparkles, CheckSquare, Square, Merge, AlertTriangle, ExternalLink,
  ChevronRight, LayoutDashboard, PlusCircle, BarChart3, TrendingUp,
  BrainCircuit, Award, Lightbulb, AlertCircle, FileSpreadsheet, ClipboardList, FolderOpen
} from "lucide-react";
import TeacherHome from "@/components/TeacherHome";
import ResourceLibrary from "@/components/ResourceLibrary";
import { formatVietnameseName, getFirstName, sortVietnameseNames, isHeaderOrInvalidCell } from "@/lib/vietnameseName";
import { ACTIVITIES } from "@/lib/data/activities";

const privateFileHref = (value: string) => value.startsWith("http") ? value : `/api/files?bucket=${value.startsWith("chat/") || value.startsWith("submissions/") || value.startsWith("group-submissions/") ? "class-work" : "videos"}&path=${encodeURIComponent(value)}`;

export default function GiaoVienPage({ previewMode = false }: { previewMode?: boolean }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("home");
  const [activities, setActivities] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isChatMuted, setIsChatMuted] = useState(false);

  // Helpers
  const getAvatar = (name: string) => (name ? name.split(' ').pop()?.charAt(0).toUpperCase() || "?" : "?");
  const formatTime = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + " - " + d.toLocaleDateString('vi-VN');
  };

  // Chat
  const [newMsg, setNewMsg] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Chấm điểm cá nhân
  const [selectedGradingAct, setSelectedGradingAct] = useState<any>(null);
  const [rubricText, setRubricText] = useState("");
  const [rubricFileName, setRubricFileName] = useState("");
  const [gradingId, setGradingId] = useState<string | null>(null);

  // Quản lý & Gộp bài tập cá nhân
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [selectedActsToMerge, setSelectedActsToMerge] = useState<number[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTitle, setMergeTitle] = useState("");
  const [mergeDesc, setMergeDesc] = useState("");

  // Tạo bài tập mới
  const [newActTitle, setNewActTitle] = useState("");
  const [newActDesc, setNewActDesc] = useState("");
  const [newActVideo, setNewActVideo] = useState("");
  const [newActDeadline, setNewActDeadline] = useState("");
  const [newActRubric, setNewActRubric] = useState("");
  const [newActFile, setNewActFile] = useState<File | null>(null);
  const [isCreatingAct, setIsCreatingAct] = useState(false);

  // Sinh viên
  const [newStudentName, setNewStudentName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [importPreviewNames, setImportPreviewNames] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pasteNamesText, setPasteNamesText] = useState("");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [isSavingStudents, setIsSavingStudents] = useState(false);

  // Quản lý bài tập nhóm
  const [groupAssignments, setGroupAssignments] = useState<any[]>([]);
  const [expandedGroupAct, setExpandedGroupAct] = useState<string | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupDeadline, setNewGroupDeadline] = useState("");
  const [newGroupDocUrl, setNewGroupDocUrl] = useState("");
  const [newGroupRubric, setNewGroupRubric] = useState("");
  const [numGroups, setNumGroups] = useState(4);
  const [maxStudentsPerGroup, setMaxStudentsPerGroup] = useState(6);
  const [currentGroupMembers, setCurrentGroupMembers] = useState<any[]>([]);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupRubricText, setGroupRubricText] = useState("");
  const [groupSubmissions, setGroupSubmissions] = useState<any[]>([]);

  // OCR chấm ảnh & Lưu DB
  const [ocrText, setOcrText] = useState("");
  const [ocrRubric, setOcrRubric] = useState("");
  const [ocrStudentName, setOcrStudentName] = useState("");
  const [ocrActivityId, setOcrActivityId] = useState<number>(1);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSavingOcr, setIsSavingOcr] = useState(false);

  // Tạo trắc nghiệm & AI Generate Quiz
  const [quizTitle, setQuizTitle] = useState("");
  const [quizActivity, setQuizActivity] = useState(1);
  const [quizTime, setQuizTime] = useState(15);
  const [newQs, setNewQs] = useState([{ question: "", image_url: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }]);
  const [aiQuizTopic, setAiQuizTopic] = useState("Đặc tính của tụ điện, công thức điện dung và năng lượng");
  const [aiQuizCount, setAiQuizCount] = useState(4);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // AI Analytics & Báo cáo phổ điểm
  const [analyticsReport, setAnalyticsReport] = useState<any>(null);
  const [isAnalyzingClass, setIsAnalyzingClass] = useState(false);

  const fetchData = useCallback(async () => {
    if (previewMode) {
      setActivities(ACTIVITIES);
      setStudents([
        { id: "demo-student-1", full_name: "Nguyễn Minh Anh", class_name: "11A1" },
        { id: "demo-student-2", full_name: "Trần Gia Bảo", class_name: "11A1" },
        { id: "demo-student-3", full_name: "Lê Khánh Linh", class_name: "11A2" },
      ]);
      setSubmissions([
        { id: "demo-submission-1", student_name: "Nguyễn Minh Anh", activity_id: 4, ai_score: null, status: "pending", submitted_at: new Date().toISOString(), answer: "Bài nộp mẫu chỉ hiển thị trong chế độ xem thử." },
        { id: "demo-submission-2", student_name: "Trần Gia Bảo", activity_id: 4, ai_score: 8, status: "graded", submitted_at: new Date().toISOString(), answer: "Dữ liệu giả lập, không phải bài làm thật." },
      ]);
      setMessages([
        { id: "demo-message-1", sender_name: "Nguyễn Minh Anh", content: "Cô ơi, em đã hoàn thành phiếu thí nghiệm ạ.", created_at: new Date().toISOString() },
        { id: "demo-message-2", sender_name: "Giáo viên", content: "Các em nhớ ghi rõ đơn vị trong bảng số liệu nhé.", created_at: new Date().toISOString() },
      ]);
      setQuizzes([]);
      setGroupAssignments([]);
      setGroupSubmissions([]);
      setIsChatMuted(false);
      return;
    }
    try {
      const [
        { data: acts },
        { data: studs },
        { data: subs },
        { data: msgs },
        { data: qzs },
        { data: setting },
        { data: gActs },
        { data: gSubs },
        { data: guides },
      ] = await Promise.all([
        supabase.from('activities').select('*').order('id').limit(300),
        supabase.from('students').select('id,full_name,class_name').order('full_name').limit(1000),
        supabase.from('submissions').select('*').order('submitted_at', { ascending: false }).limit(300),
        supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('quizzes').select('*').order('id').limit(300),
        supabase.from('chat_settings').select('is_muted').eq('id', 1).single(),
        supabase.from('group_assignments').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('group_submissions').select('*').order('submitted_at', { ascending: false }).limit(300),
        supabase.from('activity_grading_guides').select('activity_id,model_answer,grading_rubric'),
      ]);

      if (acts) {
        const guidesByActivity = new Map((guides || []).map((guide) => [guide.activity_id, guide]));
        const activitiesWithGuides = acts.map((activity) => ({ ...activity, ...(guidesByActivity.get(activity.id) || {}) }));
        setActivities(activitiesWithGuides);
        if (!selectedGradingAct && activitiesWithGuides.length > 0) {
          setSelectedGradingAct(activitiesWithGuides[0]);
          setRubricText(activitiesWithGuides[0].grading_rubric || "");
        }
      }
      if (studs) {
        const sortedStuds = [...studs].filter((student) => student && student.id && student.full_name).sort(sortVietnameseNames);
        setStudents(sortedStuds);
      }
      if (subs) setSubmissions(subs);
      if (msgs) setMessages([...msgs].reverse());
      if (qzs) setQuizzes(qzs);
      if (setting) setIsChatMuted(setting.is_muted);
      if (gActs) setGroupAssignments(gActs);
      if (gSubs) setGroupSubmissions(gSubs);
    } catch (err) {
      console.warn("Lỗi tải dữ liệu giáo viên:", err);
    }
  }, [previewMode, selectedGradingAct]);

  useEffect(() => {
    if (previewMode) return;
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, previewMode]);

  useEffect(() => {
    if (previewMode) return;
    const refreshMessages = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100);
      if (data) setMessages([...data].reverse());
    };
    const timer = window.setInterval(() => void refreshMessages(), 5000);
    return () => window.clearInterval(timer);
  }, [previewMode]);
  const handleLogout = async () => {
    if (previewMode) return;
    localStorage.removeItem('teacher_session');
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- QUẢN LÝ BÀI HỌC CÁ NHÂN & GỘP BÀI ---
  const saveActivity = async (id: number, e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const desc = (form.elements.namedItem('desc') as HTMLInputElement).value;
    const video = (form.elements.namedItem('video') as HTMLInputElement).value;
    const deadline = (form.elements.namedItem('deadline') as HTMLInputElement).value;
    const rubric = (form.elements.namedItem('rubric') as HTMLTextAreaElement)?.value || "";
    const acceptingSubmissions = (form.elements.namedItem('accepting_submissions') as HTMLInputElement).checked;

    const { error } = await supabase.from('activities').update({
      title,
      description: desc,
      video_url: video,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      accepting_submissions: acceptingSubmissions
    }).eq('id', id);
    if (error) { alert("Không lưu được bài học: " + error.message); return; }

    const activity = activities.find((item) => item.id === id);
    const { error: guideError } = await supabase.from('activity_grading_guides').upsert({
      activity_id: id,
      model_answer: activity?.model_answer || null,
      grading_rubric: rubric || null,
    });
    if (guideError) { alert("Bài học đã lưu nhưng tiêu chí chấm chưa lưu được: " + guideError.message); return; }

    alert("✅ Đã lưu cập nhật bài học!");
    setExpandedAct(null);
    fetchData();
  };
  const deleteActivity = async (id: number) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Bài học số ${id}? Thao tác này không thể hoàn tác.`)) return;
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (!error) {
      alert("Đã xóa bài học thành công!");
      fetchData();
    } else {
      alert("Lỗi khi xóa bài học: " + error.message);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, actId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `act-${actId}-${Date.now()}-${cleanName}`;
    if (file.size > 100 * 1024 * 1024) { alert("Tài liệu không được vượt quá 100 MB."); return; }
    const { error } = await supabase.storage.from('videos').upload(fileName, file, { contentType: file.type || "application/octet-stream" });
    if (!error) {
      await supabase.from('activities').update({ document_url: fileName }).eq('id', actId);
      alert("✅ Đã tải lên tài liệu cho bài học!");
      fetchData();
    } else {
      alert("Lỗi tải tệp: " + error.message);
    }
  };

  // Logic Gộp bài tập
  const toggleSelectActToMerge = (id: number) => {
    setSelectedActsToMerge(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const executeMergeActivities = async () => {
    if (selectedActsToMerge.length < 2) {
      alert("Vui lòng chọn ít nhất 2 bài tập để thực hiện gộp!");
      return;
    }
    if (!mergeTitle.trim()) {
      alert("Vui lòng nhập tiêu đề cho bài học sau khi gộp!");
      return;
    }

    const actsToMerge = activities.filter(a => selectedActsToMerge.includes(a.id));
    const sorted = [...selectedActsToMerge].sort((a, b) => a - b);
    const targetId = sorted[0];
    const removeIds = sorted.slice(1);
    const mergedDesc = mergeDesc.trim() || actsToMerge.map(a => `[Bài ${a.id}]: ${a.title}`).join(" | ");
    const mergedRubric = actsToMerge.map(a => a.grading_rubric).filter(Boolean).join("\n---\n");

    const { error: activityError } = await supabase.from('activities').update({ title: mergeTitle.trim(), description: mergedDesc }).eq('id', targetId);
    if (activityError) { alert("Không gộp được hoạt động: " + activityError.message); return; }
    const target = actsToMerge.find((activity) => activity.id === targetId);
    const { error: guideError } = await supabase.from('activity_grading_guides').upsert({ activity_id: targetId, model_answer: target?.model_answer || null, grading_rubric: mergedRubric || null });
    if (guideError) { alert("Đã cập nhật hoạt động nhưng không lưu được tiêu chí gộp: " + guideError.message); return; }

    for (const oldId of removeIds) {
      const { error: submissionError } = await supabase.from('submissions').update({ activity_id: targetId }).eq('activity_id', oldId);
      if (submissionError) { alert(`Dừng gộp ở bài ${oldId}: ${submissionError.message}`); fetchData(); return; }
      const { error: deleteError } = await supabase.from('activities').delete().eq('id', oldId);
      if (deleteError) { alert(`Đã chuyển bài nộp nhưng không xóa được bài ${oldId}: ${deleteError.message}`); fetchData(); return; }
    }

    alert(`✅ Đã gộp thành công ${selectedActsToMerge.length} bài thành Bài số ${targetId}: "${mergeTitle}"!`);
    setSelectedActsToMerge([]);
    setShowMergeModal(false);
    setMergeTitle("");
    setMergeDesc("");
    fetchData();
  };
  // --- TẠO BÀI TẬP MỚI ---
  const handleCreateNewActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim()) {
      alert("Vui lòng nhập tên bài tập mới!");
      return;
    }
    setIsCreatingAct(true);

    try {
      let uploadedDocUrl = "";
      if (newActFile) {
        const cleanName = newActFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `act-new-${Date.now()}-${cleanName}`;
        if (newActFile.size > 100 * 1024 * 1024) throw new Error("Tài liệu không được vượt quá 100 MB.");
        const { error: upErr } = await supabase.storage.from('videos').upload(fileName, newActFile, { contentType: newActFile.type || "application/octet-stream" });
        if (upErr) throw new Error("Tải tài liệu lên thất bại: " + upErr.message);
        uploadedDocUrl = fileName;
      }

      const { data: createdActivity, error } = await supabase.from('activities').insert({
        title: newActTitle.trim(),
        description: newActDesc.trim() || "Bài tập rèn luyện Vật lí 11",
        video_url: newActVideo.trim() || null,
        document_url: uploadedDocUrl || null,
        deadline: newActDeadline ? new Date(newActDeadline).toISOString() : null,
        status: "available",
      }).select('id').single();
      if (error || !createdActivity) throw new Error(error?.message || "Không tạo được bài học.");

      const { error: guideError } = await supabase.from('activity_grading_guides').upsert({
        activity_id: createdActivity.id,
        grading_rubric: newActRubric.trim() || null,
      });
      if (guideError) {
        await supabase.from('activities').delete().eq('id', createdActivity.id);
        throw new Error("Không lưu được tiêu chí chấm: " + guideError.message);
      }

      alert(`✅ Đã tạo thành công Bài tập số ${createdActivity.id}!`);
      setNewActTitle("");
      setNewActDesc("");
      setNewActVideo("");
      setNewActDeadline("");
      setNewActRubric("");
      setNewActFile(null);
      setActiveTab("activities");
      fetchData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsCreatingAct(false);
    }
  };
  // --- QUẢN LÝ BÀI TẬP NHÓM ---
  const createGroupAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupTitle) return;

    const { data: newAct, error } = await supabase.from('group_assignments').insert([{
      title: newGroupTitle,
      description: newGroupDesc,
      deadline: newGroupDeadline ? new Date(newGroupDeadline).toISOString() : null,
      document_url: newGroupDocUrl || null,
      rubric: newGroupRubric || null,
    }]).select();

    if (newAct && newAct.length > 0) {
      const assignId = newAct[0].id;
      let pool = [...students];
      let studentIndex = 0;
      for (let i = 1; i <= numGroups; i++) {
        const { data: groupData } = await supabase.from('group_assignment_groups').insert([{ assignment_id: assignId, group_number: i, group_name: `Nhóm ${i}` }]).select();
        if (groupData) {
          const groupId = groupData[0].id;
          const membersToAdd = pool.slice(studentIndex, studentIndex + maxStudentsPerGroup);
          if (membersToAdd.length > 0) {
            const inserts = membersToAdd.map(s => ({ group_id: groupId, student_id: s.id }));
            await supabase.from('group_assignment_members').insert(inserts);
          }
          studentIndex += maxStudentsPerGroup;
        }
      }
    }
    setNewGroupTitle("");
    setNewGroupDesc("");
    setNewGroupDeadline("");
    setNewGroupDocUrl("");
    setNewGroupRubric("");
    alert("✅ Đã tạo bài tập nhóm, thiết lập tài liệu và chia nhóm thành công!");
    fetchData();
  };

  const deleteGroupAssignment = async (id: string) => {
    if(confirm("Xóa bài tập nhóm này và toàn bộ danh sách nhóm/bài nộp?")) {
      await supabase.from('group_assignments').delete().eq('id', id);
      fetchData();
    }
  };

  const fetchGroupDetails = async (assignId: string) => {
    const { data: groups } = await supabase.from('group_assignment_groups').select('*, group_assignment_members(*, students(*))').eq('assignment_id', assignId).order('group_number');
    if (groups) setCurrentGroupMembers(groups);

    const { data: act } = await supabase.from('group_assignments').select('*').eq('id', assignId).single();
    if (act) setGroupRubricText(act.rubric || "");
  };

  const beginRenameGroup = (group: any) => {
    setRenamingGroupId(group.id);
    setGroupNameDraft(group.group_name || `Nhóm ${group.group_number}`);
  };

  const renameGroup = async (group: any) => {
    const nextName = groupNameDraft.trim();
    if (!nextName) return alert("Tên nhóm không được để trống.");
    if (nextName.length > 60) return alert("Tên nhóm tối đa 60 ký tự.");
    const { error } = await supabase.from("group_assignment_groups").update({ group_name: nextName }).eq("id", group.id);
    if (error) return alert("Không đổi được tên nhóm: " + error.message);
    setRenamingGroupId(null);
    setGroupNameDraft("");
    await fetchGroupDetails(group.assignment_id);
  };

  const toggleExpandGroupAct = (id: string) => {
    if (expandedGroupAct === id) {
      setExpandedGroupAct(null);
      setCurrentGroupMembers([]);
    } else {
      setExpandedGroupAct(id);
      fetchGroupDetails(id);
    }
  };

  const createGroupsForAssignment = async (assignId: string, isRandom: boolean) => {
    if(!confirm(`Thiết lập ${numGroups} nhóm (tối đa ${maxStudentsPerGroup} SV/nhóm)? Thao tác này sẽ phân bổ lại học sinh.`)) return;
    await supabase.from('group_assignment_groups').delete().eq('assignment_id', assignId);

    let pool = [...students];
    if (isRandom) pool = pool.sort(() => Math.random() - 0.5);

    let studentIndex = 0;
    for (let i = 1; i <= numGroups; i++) {
      const { data: groupData } = await supabase.from('group_assignment_groups').insert([{ assignment_id: assignId, group_number: i, group_name: `Nhóm ${i}` }]).select();
      if (groupData) {
        const groupId = groupData[0].id;
        const membersToAdd = pool.slice(studentIndex, studentIndex + maxStudentsPerGroup);
        if (membersToAdd.length > 0) {
          const inserts = membersToAdd.map(s => ({ group_id: groupId, student_id: s.id }));
          await supabase.from('group_assignment_members').insert(inserts);
        }
        studentIndex += maxStudentsPerGroup;
      }
    }
    alert("✅ Đã chia nhóm thành công!");
    fetchGroupDetails(assignId);
  };

  const saveGroupRubric = async (assignId: string) => {
    await supabase.from('group_assignments').update({ rubric: groupRubricText }).eq('id', assignId);
    alert("✅ Đã lưu ma trận điểm bài nhóm!");
  };

  const gradeGroupWithAI = async (subId: string, answer: string) => {
    setGradingId(subId);
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentAnswer: answer,
          rubricText: groupRubricText,
          activityId: expandedGroupAct
        })
      });
      const data = await res.json();
      if (data.score !== undefined) {
        await supabase.from('group_submissions').update({
          ai_score: data.score,
          ai_feedback: data.feedback,
          ai_strengths: data.strengths,
          ai_weaknesses: data.weaknesses,
          ai_model_answer: data.model_answer,
          status: 'graded'
        }).eq('id', subId);
        fetchData();
      }
    } catch (e: any) {
      alert("Lỗi chấm AI: " + e.message);
    } finally {
      setGradingId(null);
    }
  };

  // --- CHẤM ĐIỂM CÁ NHÂN ---
  const saveRubric = async () => {
    if (!selectedGradingAct) return;
    const { error } = await supabase.from('activity_grading_guides').upsert({
      activity_id: selectedGradingAct.id,
      model_answer: selectedGradingAct.model_answer || null,
      grading_rubric: rubricText || null,
    });
    if (error) { alert("Không lưu được ma trận điểm: " + error.message); return; }
    alert("✅ Đã lưu ma trận điểm cho bài " + selectedGradingAct.id);
    fetchData();
  };
  const handleRubricFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRubricFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setRubricText(text);
    };
    reader.readAsText(file);
  };

  const gradeWithAI = async (id: string, answer: string) => {
    setGradingId(id);
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentAnswer: answer,
          rubricText: rubricText,
          activityId: selectedGradingAct?.id,
          activityTitle: selectedGradingAct?.title
        })
      });
      const data = await res.json();
      if (data.score !== undefined) {
        await supabase.from('submissions').update({
          ai_score: data.score,
          ai_feedback: data.feedback,
          ai_strengths: data.strengths,
          ai_weaknesses: data.weaknesses,
          ai_model_answer: data.model_answer,
          status: 'graded'
        }).eq('id', id);
        fetchData();
      }
    } catch (err: any) {
      alert("Lỗi chấm AI: " + err.message);
    } finally {
      setGradingId(null);
    }
  };

  // --- CHẤM ẢNH OCR & LƯU VÀO DATABASE ---
  const handleOcrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsOcrProcessing(true);
    setOcrResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Data = evt.target?.result as string;
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: base64Data, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.text) {
          setOcrText(data.text);
          alert("✅ Đã nhận diện văn bản từ ảnh! Hãy bấm 'Chấm điểm bằng AI'.");
        } else {
          alert("Lỗi OCR: " + (data.error || "Không thể đọc nội dung ảnh"));
        }
        setIsOcrProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
      setIsOcrProcessing(false);
    }
  };

  const executeOcrGrading = async () => {
    if (!ocrText.trim()) {
      alert("Chưa có nội dung văn bản để chấm điểm.");
      return;
    }
    setIsOcrProcessing(true);
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentAnswer: ocrText,
          rubricText: ocrRubric,
          activityId: ocrActivityId,
        }),
      });
      const data = await res.json();
      setOcrResult(data);
    } catch (err: any) {
      alert("Lỗi chấm điểm: " + err.message);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const saveOcrSubmissionToDB = async () => {
    if (!ocrStudentName.trim()) {
      alert("Vui lòng chọn hoặc nhập tên học sinh để lưu bài nộp!");
      return;
    }
    if (!ocrResult) {
      alert("Vui lòng chấm điểm bài làm trước khi lưu!");
      return;
    }

    setIsSavingOcr(true);
    try {
      const { error } = await supabase.from('submissions').insert([{
        student_name: ocrStudentName.trim(),
        activity_id: ocrActivityId,
        answer: `[Bài thi OCR]:\n${ocrText}`,
        ai_score: ocrResult.score,
        ai_feedback: ocrResult.feedback,
        ai_strengths: ocrResult.strengths,
        ai_weaknesses: ocrResult.weaknesses,
        ai_model_answer: ocrResult.model_answer,
        status: 'graded',
        submitted_at: new Date().toISOString(),
      }]);

      if (!error) {
        alert("✅ Đã lưu kết quả bài thi vào cơ sở dữ liệu thành công!");
        setOcrText("");
        setOcrResult(null);
        fetchData();
      } else {
        alert("Lỗi lưu DB: " + error.message);
      }
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsSavingOcr(false);
    }
  };

  // --- TẠO CÂU HỎI TRẮC NGHIỆM BẰNG AI ---
  const handleGenerateQuizWithAI = async () => {
    if (!aiQuizTopic.trim()) {
      alert("Vui lòng nhập chủ đề câu hỏi!");
      return;
    }
    setIsGeneratingQuiz(true);
    try {
      const res = await fetch('/api/ai-generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiQuizTopic, count: aiQuizCount }),
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setNewQs(data.questions.map((q: any) => ({
          question: q.question,
          image_url: "",
          options: q.options || ["", "", "", ""],
          correct_option: q.correct_option ?? 0,
          explanation: q.explanation || "",
        })));
        alert(`✅ AI đã biên soạn thành công ${data.questions.length} câu hỏi trắc nghiệm! Bạn có thể kiểm tra và bấm "Lưu bài trắc nghiệm".`);
      } else {
        alert("Không thể tạo câu hỏi: " + (data.error || "Lỗi AI"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối AI: " + err.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // --- AI ANALYTICS & BÁO CÁO PHỔ ĐIỂM ---
  const handleRunAIAnalytics = async () => {
    if (submissions.length === 0) {
      alert("Chưa có bài nộp nào để phân tích dữ liệu!");
      return;
    }
    setIsAnalyzingClass(true);
    try {
      const res = await fetch('/api/ai-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissions, activities }),
      });
      const data = await res.json();
      if (data.report) {
        setAnalyticsReport(data.report);
      } else {
        alert("Lỗi phân tích: " + (data.error || "Không có phản hồi"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối AI Analytics: " + err.message);
    } finally {
      setIsAnalyzingClass(false);
    }
  };

  // --- SINH VIÊN & XỬ LÝ NHẬP FILE THÔNG MINH ---
  const addStudentManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const formattedName = formatVietnameseName(newStudentName);

    // Kiểm tra trùng
    const exists = students.some(s => s.full_name?.toLowerCase() === formattedName.toLowerCase());
    if (exists) {
      alert(`Học sinh "${formattedName}" đã có trong danh sách!`);
      return;
    }

    const { data, error } = await supabase.from('students').insert([{ full_name: formattedName, class_name: "11A1" }]).select("id,full_name,class_name").single();
    if (error || !data) {
      alert("Không lưu được học sinh: " + (error?.message || "Cơ sở dữ liệu chưa trả về bản ghi."));
      return;
    }
    setStudents((current) => [...current, data].sort(sortVietnameseNames));
    setNewStudentName("");
    alert(`Đã lưu học sinh: ${formattedName}`);
  };

  // Hàm trích xuất và chuẩn hóa danh sách tên từ mảng chuỗi
  const processAndSortNames = (rawList: string[]): string[] => {
    const validNames: string[] = [];
    const seen = new Set<string>();

    rawList.forEach((raw) => {
      if (!raw || typeof raw !== "string") return;
      const clean = raw.trim();
      if (clean.length < 3) return;
      if (isHeaderOrInvalidCell(clean)) return;

      const formatted = formatVietnameseName(clean);
      // Kiểm tra có ít nhất 2 từ (Họ + Tên)
      const words = formatted.split(/\s+/);
      if (words.length >= 2 && !seen.has(formatted.toLowerCase())) {
        seen.add(formatted.toLowerCase());
        validNames.push(formatted);
      }
    });

    // Sắp xếp theo TÊN (First Name) theo bảng chữ cái tiếng Việt
    // Ví dụ: Đỗ Thanh Phong -> lấy P so sánh với Nguyễn Văn An -> lấy A
    return validNames.sort(sortVietnameseNames);
  };

  // Xử lý tệp Excel / TXT / CSV thông minh
  const handleSmartFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Tệp Excel vượt quá 10 MB.");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error("Tệp không có trang tính nào.");
        const candidateStrings: string[] = [];
        sheet.eachRow((row) => row.eachCell((cell) => { if (cell.text.trim()) candidateStrings.push(cell.text); }));
        const sortedList = processAndSortNames(candidateStrings);
        if (sortedList.length === 0) { alert("Không tìm thấy danh sách tên học sinh hợp lệ trong tệp Excel này!"); return; }
        setImportPreviewNames(sortedList);
        setShowImportModal(true);
      } catch (err) {
        alert("Lỗi đọc tệp Excel: " + (err instanceof Error ? err.message : "Tệp không hợp lệ."));
      }
    } else {
      // File văn bản txt/csv
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const lines = text.split(/\r?\n/);
          const sortedList = processAndSortNames(lines);
          if (sortedList.length === 0) {
            alert("Không tìm thấy danh sách tên học sinh hợp lệ trong tệp văn bản này!");
            return;
          }
          setImportPreviewNames(sortedList);
          setShowImportModal(true);
        } catch (err: any) {
          alert("Lỗi đọc tệp văn bản: " + err.message);
        }
      };
      reader.readAsText(file);
    }

    // Reset input để có thể chọn lại cùng file nếu muốn
    e.target.value = "";
  };

  // Xử lý khi paste văn bản danh sách
  const handleProcessPastedText = () => {
    if (!pasteNamesText.trim()) {
      alert("Vui lòng dán danh sách tên học sinh vào ô văn bản!");
      return;
    }
    const lines = pasteNamesText.split(/\r?\n/);
    const sortedList = processAndSortNames(lines);
    if (sortedList.length === 0) {
      alert("Không nhận diện được tên học sinh hợp lệ trong đoạn văn bản đã dán!");
      return;
    }
    setImportPreviewNames(sortedList);
    setShowPasteModal(false);
    setShowImportModal(true);
  };

  // Lưu danh sách đã xem trước vào database
  const confirmSaveImportedStudents = async () => {
    if (importPreviewNames.length === 0) return;
    setIsSavingStudents(true);
    try {
      // Lọc bỏ những tên đã có trong DB
      const existingNames = new Set(students.map(s => s.full_name?.toLowerCase()));
      const newToAdd = importPreviewNames.filter(n => !existingNames.has(n.toLowerCase()));

      if (newToAdd.length === 0) {
        alert("Toàn bộ học sinh trong danh sách đều đã có trong cơ sở dữ liệu!");
        setShowImportModal(false);
        setIsSavingStudents(false);
        return;
      }

      const inserts = newToAdd.map(name => ({
        full_name: name,
        class_name: "11A1"
      }));

      const { error } = await supabase.from('students').insert(inserts);
      if (!error) {
        alert(`✅ Đã nhập thành công ${newToAdd.length} học sinh vào lớp học!`);
        setShowImportModal(false);
        setImportPreviewNames([]);
        setPasteNamesText("");
        fetchData();
      } else {
        alert("Lỗi lưu học sinh: " + error.message);
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSavingStudents(false);
    }
  };

  const deleteStudent = async (id: string) => {
    if(confirm("Xóa học sinh này khỏi danh sách lớp?")) {
      await supabase.from('students').delete().eq('id', id);
      fetchData();
    }
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleSmartFileUpload(event);
  };
  // --- TRẮC NGHIỆM & CHAT ---
  const createQuiz = async () => {
    if (!quizTitle.trim()) return alert("Nhập tên bài trắc nghiệm!");
    const validQuestions = newQs.filter((question) => question.question.trim() && question.options.every((option) => option.trim()));
    if (!validQuestions.length) return alert("Cần ít nhất một câu hỏi có đủ bốn lựa chọn.");

    const { data: quiz, error: quizError } = await supabase.from('quizzes')
      .insert({ activity_id: quizActivity, title: quizTitle.trim(), time_limit: quizTime })
      .select('id').single();
    if (quizError || !quiz) return alert("Không tạo được bài trắc nghiệm: " + (quizError?.message || "lỗi không rõ"));

    for (const question of validQuestions) {
      const { data: savedQuestion, error: questionError } = await supabase.from('quiz_questions')
        .insert({ quiz_id: quiz.id, question: question.question.trim(), image_url: question.image_url || null, options: question.options })
        .select('id').single();
      if (questionError || !savedQuestion) {
        await supabase.from('quizzes').delete().eq('id', quiz.id);
        return alert("Không lưu được câu hỏi: " + (questionError?.message || "lỗi không rõ"));
      }
      const { error: keyError } = await supabase.from('quiz_question_keys').insert({
        question_id: savedQuestion.id,
        correct_option: question.correct_option,
        explanation: question.explanation || null,
      });
      if (keyError) {
        await supabase.from('quizzes').delete().eq('id', quiz.id);
        return alert("Không lưu được đáp án bảo mật: " + keyError.message);
      }
    }

    alert("✅ Tạo bài trắc nghiệm thành công!");
    setQuizTitle("");
    setNewQs([{ question: "", image_url: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }]);
    fetchData();
  };
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMsg.trim() && !chatFile) || isSendingChat) return;
    setIsSendingChat(true);
    try {
      let attachment: Record<string, string> = {};
      if (chatFile) {
        if (chatFile.size > 25 * 1024 * 1024) throw new Error("Tệp chat tối đa 25 MB.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        const safeName = chatFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `chat/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("class-work").upload(path, chatFile, { upsert: false, contentType: chatFile.type || "application/octet-stream" });
        if (uploadError) throw uploadError;
        attachment = { attachment_url: path, attachment_name: chatFile.name, attachment_type: chatFile.type || "application/octet-stream" };
      }
      const { error } = await supabase.from("messages").insert([{ sender_name: "Cô Hương Xuân (Giáo viên)", content: newMsg.trim(), ...attachment }]);
      if (error) throw error;
      setNewMsg(""); setChatFile(null); await fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không gửi được tin nhắn.");
    } finally { setIsSendingChat(false); }
  };

  const deleteMessage = async (message: any) => {
    if (!confirm("Xóa tin nhắn này khỏi kênh chat?")) return;
    if (message.attachment_url && !message.attachment_url.startsWith("http")) {
      const { error: fileError } = await supabase.storage.from("class-work").remove([message.attachment_url]);
      if (fileError) { alert("Không xóa được tệp đính kèm: " + fileError.message); return; }
    }
    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) alert("Không xóa được tin nhắn: " + error.message);
    else await fetchData();
  };
  const exportScores = () => {
    if (submissions.length === 0) return alert("Chưa có bài nộp nào.");
    const csv = [
      "Học sinh,Bài tập,Điểm AI,Nhận xét,Trạng thái,Ngày nộp",
      ...submissions.map((s: any) => {
        const act = activities.find(a => a.id === s.activity_id);
        return `"${s.student_name}","${act ? act.title : 'Bài ' + s.activity_id}","${s.ai_score ?? 0}","${(s.ai_feedback || "").replace(/"/g, '""')}","${s.status}","${new Date(s.submitted_at).toLocaleString('vi-VN')}"`;
      }),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bang-diem-vatly11-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentSubmissions = selectedGradingAct ? submissions.filter(s => s.activity_id === selectedGradingAct.id) : [];
  const currentGroupSubs = expandedGroupAct ? groupSubmissions.filter(s => s.assignment_id === expandedGroupAct) : [];

  // Thống kê phổ điểm
  const gradedSubs = submissions.filter(s => s.ai_score !== null && s.ai_score !== -1);
  const excellentCount = gradedSubs.filter(s => s.ai_score >= 8).length;
  const goodCount = gradedSubs.filter(s => s.ai_score >= 6.5 && s.ai_score < 8).length;
  const avgCount = gradedSubs.filter(s => s.ai_score >= 5 && s.ai_score < 6.5).length;
  const weakCount = gradedSubs.filter(s => s.ai_score < 5).length;

  return (
    <main
      className="min-h-screen flex bg-slate-50"
      onClickCapture={(event) => {
        if (!previewMode || (event.target instanceof Element && event.target.closest("aside button"))) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onSubmitCapture={(event) => {
        if (!previewMode) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onChangeCapture={(event) => {
        if (!previewMode || (event.target instanceof Element && event.target.closest("aside"))) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {previewMode && <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950 shadow-lg">Đang xem dashboard thật với dữ liệu mẫu. Các thao tác ghi đang khóa.</div>}
      {/* SIDEBAR ĐỒNG BỘ MÀU SLATE-900 VÀ CÁC PHÂN HỆ RÕ RÀNG */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20 shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-blue-900/60 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/30">
              V11
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-wide text-white">GIÁO VIÊN PORTAL</h1>
              <p className="text-[11px] text-blue-200">Cô Hương Xuân • Lớp 11A1</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-6 overflow-y-auto text-xs font-semibold">
          {/* TỔNG QUAN */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng quan</p>
            <button
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'home' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Home className="w-4 h-4 text-blue-400" /> Trang chủ Bảng điều khiển
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl mt-1 transition-all ${
                activeTab === 'analytics' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <BrainCircuit className="w-4 h-4 text-emerald-400" /> AI Phân tích & Báo cáo Lớp
            </button>
          </div>

          {/* QUẢN LÝ BÀI TẬP */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quản lý Bài tập</p>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('activities')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'activities' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-400" /> Bài học cá nhân ({activities.length})
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-amber-300" /> Kho học liệu
              </button>
              <button
                onClick={() => setActiveTab('create_activity')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'create_activity' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Tạo bài tập mới
              </button>
              <button
                onClick={() => setActiveTab('group_assignments')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'group_assignments' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4 text-orange-400" /> Bài tập Nhóm ({groupAssignments.length})
              </button>
            </div>
          </div>

          {/* CHẤM ĐIỂM & AI */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chấm điểm & AI</p>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('grading')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'grading' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-400" /> Chấm điểm cá nhân
              </button>
              <button
                onClick={() => setActiveTab('ocr')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'ocr' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Camera className="w-4 h-4 text-purple-400" /> Chấm từ ảnh (AI OCR)
              </button>
              <button
                onClick={() => setActiveTab('regrade')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'regrade' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <RefreshCw className="w-4 h-4 text-amber-400" /> Chấm lại bài lỗi ({submissions.filter(s => s.ai_score === null || s.ai_score === -1).length})
              </button>
            </div>
          </div>

          {/* LỚP HỌC & TRẮC NGHIỆM */}
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lớp học</p>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('students')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'students' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" /> Danh sách sinh viên ({students.length})
              </button>
              <button
                onClick={() => setActiveTab('quizzes')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'quizzes' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-400" /> Tạo Trắc nghiệm & AI Sinh Đề
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'chat' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-blue-400" /> Kênh thảo luận ({messages.length})
              </button>
            </div>
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-1 text-xs font-semibold">
          <Link href="/hoc-sinh" className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
            <ExternalLink className="w-4 h-4" /> Xem giao diện Học sinh
          </Link>
          <Link href="/" className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
            <Home className="w-4 h-4" /> Về Trang chủ Website
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:text-white hover:bg-rose-600/40 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* CONTENT AREA CHÍNH */}
      <div className="flex-1 p-6 md:p-10 h-screen overflow-y-auto relative">
        <Link href="/" className="absolute top-6 right-8 bg-white text-slate-600 p-3 rounded-full shadow-md border hover:bg-slate-50 transition-all z-10" title="Về trang chủ">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* 1. TAB TRANG CHỦ GIÁO VIÊN */}
        {activeTab === 'home' && (
          <TeacherHome previewMode={previewMode} onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {activeTab === 'resources' && <ResourceLibrary previewMode={previewMode} activities={activities} />}

        {/* 2. TAB AI ANALYTICS & BÁO CÁO PHỔ ĐIỂM */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                  <BrainCircuit className="w-8 h-8 text-indigo-600" /> Báo Cáo Phân Tích Lớp Học AI
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Đánh giá phổ điểm, nhận diện 3 lỗ hổng kiến thức phổ biến và đề xuất kế hoạch dạy học đảo ngược trên lớp.
                </p>
              </div>
              <button
                onClick={handleRunAIAnalytics}
                disabled={isAnalyzingClass}
                className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzingClass ? "AI đang phân tích toàn bộ lớp..." : "Kích hoạt AI Phân tích Lỗ hổng"}
              </button>
            </div>

            {/* Thống kê phổ điểm nhanh */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm">
                <span className="text-xs font-bold text-emerald-700 uppercase block">Xuất sắc (8 - 10đ)</span>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{excellentCount}</p>
                <p className="text-[11px] text-slate-400 mt-1">Nắm vững hiện tượng & công thức</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm">
                <span className="text-xs font-bold text-blue-700 uppercase block">Khá (6.5 - 7.9đ)</span>
                <p className="text-3xl font-extrabold text-blue-600 mt-1">{goodCount}</p>
                <p className="text-[11px] text-slate-400 mt-1">Sai sót nhỏ về đơn vị/trình bày</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-amber-100 shadow-sm">
                <span className="text-xs font-bold text-amber-700 uppercase block">Trung bình (5 - 6.4đ)</span>
                <p className="text-3xl font-extrabold text-amber-600 mt-1">{avgCount}</p>
                <p className="text-[11px] text-slate-400 mt-1">Cần củng cố cách suy luận</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-rose-100 shadow-sm">
                <span className="text-xs font-bold text-rose-700 uppercase block">Cần hỗ trợ (&lt; 5đ)</span>
                <p className="text-3xl font-extrabold text-rose-600 mt-1">{weakCount}</p>
                <p className="text-[11px] text-slate-400 mt-1">Hổng kiến thức cơ bản</p>
              </div>
            </div>

            {/* Báo cáo phân tích chuyên sâu của AI */}
            {analyticsReport ? (
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6 animate-in fade-in">
                <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                  <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" /> Nhận định năng lực chung của lớp:
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">{analyticsReport.summary}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Top 3 Lỗ hổng khái niệm học sinh dễ nhầm lẫn:
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {analyticsReport.topWeaknesses?.map((w: string, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs text-slate-700 space-y-1">
                        <span className="font-bold text-rose-700 block">Lỗ hổng #{idx + 1}</span>
                        <p>{w}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5 pt-2">
                  <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                    <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-emerald-600" /> Đề xuất hoạt động trên lớp (Flipped Classroom):
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{analyticsReport.flippedClassroomAdvice}</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                    <h4 className="font-bold text-xs text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-blue-600" /> Biện pháp bổ trợ học sinh yếu:
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">{analyticsReport.remedialAction}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
                <BrainCircuit className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Chưa kích hoạt báo cáo AI</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Bấm nút &quot;Kích hoạt AI Phân tích Lỗ hổng&quot; ở góc trên để hệ thống phân tích bài làm của lớp.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. TAB BÀI HỌC CÁ NHÂN & GỘP BÀI TẬP */}
        {activeTab === 'activities' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900">Quản lý Bài học Cá nhân ({activities.length})</h2>
                <p className="text-slate-500 text-sm mt-1">Chỉnh sửa nội dung, đính kèm tài liệu, cài ma trận điểm hoặc gộp các bài học lại với nhau.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('create_activity')}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Tạo bài tập mới
                </button>
                {selectedActsToMerge.length >= 2 && (
                  <button
                    onClick={() => {
                      const selectedObjs = activities.filter(a => selectedActsToMerge.includes(a.id));
                      setMergeTitle(`Tổng hợp: ${selectedObjs.map(a => a.title).join(" + ")}`);
                      setShowMergeModal(true);
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 animate-bounce"
                  >
                    <Merge className="w-4 h-4" /> Gộp ({selectedActsToMerge.length}) bài đã chọn
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs text-blue-900">
              <span>💡 Tích chọn vào các ô vuông ở góc mỗi bài học để <strong>Gộp 2 hoặc nhiều bài thành 1 bài duy nhất</strong>.</span>
              {selectedActsToMerge.length > 0 && (
                <button onClick={() => setSelectedActsToMerge([])} className="text-blue-700 underline font-semibold">
                  Hủy chọn ({selectedActsToMerge.length})
                </button>
              )}
            </div>

            {/* Danh sách bài tập */}
            <div className="space-y-3">
              {activities.map(act => {
                const isSelectedForMerge = selectedActsToMerge.includes(act.id);
                return (
                  <div key={act.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${
                    isSelectedForMerge ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200/80 hover:border-slate-300'
                  }`}>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSelectActToMerge(act.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {isSelectedForMerge ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </button>
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {act.id}
                        </div>
                        <div onClick={() => setExpandedAct(expandedAct === act.id ? null : act.id)} className="cursor-pointer">
                          <h3 className="font-bold text-base text-slate-800">{act.title}</h3>
                          <p className="text-xs text-slate-500">
                            {act.description || "Chưa có mô tả"} • {act.deadline ? `Hạn: ${new Date(act.deadline).toLocaleString('vi-VN')}` : "Không giới hạn hạn nộp"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedAct(expandedAct === act.id ? null : act.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          {expandedAct === act.id ? "Đóng" : "Sửa bài"}
                        </button>
                        <button
                          onClick={() => deleteActivity(act.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Xóa bài tập này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Form chỉnh sửa bài học */}
                    {expandedAct === act.id && (
                      <form onSubmit={(e) => saveActivity(act.id, e)} className="p-6 border-t bg-slate-50/70 space-y-4 rounded-b-2xl">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Tên bài học</label>
                            <input name="title" defaultValue={act.title} className="w-full p-2.5 border rounded-xl bg-white outline-none text-sm" required />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả ngắn</label>
                            <input name="desc" defaultValue={act.description || ""} className="w-full p-2.5 border rounded-xl bg-white outline-none text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Link Video bài giảng (YouTube / Drive)</label>
                            <input name="video" defaultValue={act.video_url || ""} placeholder="https://..." className="w-full p-2.5 border rounded-xl bg-white outline-none text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Hạn nộp bài</label>
                            <input type="datetime-local" name="deadline" defaultValue={act.deadline ? new Date(act.deadline).toISOString().slice(0, 16) : ""} className="w-full p-2.5 border rounded-xl bg-white outline-none text-sm" />
                          </div>
                        </div>

                        <label className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm font-semibold text-slate-700">
                          <input type="checkbox" name="accepting_submissions" defaultChecked={act.accepting_submissions !== false} className="h-4 w-4 accent-blue-600" />
                          Cho phép học sinh nộp bài cho hoạt động này
                        </label>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">Ma trận điểm (Rubric) cho bài này</label>
                          <textarea
                            name="rubric"
                            defaultValue={act.grading_rubric || ""}
                            placeholder="Ví dụ: 4đ công thức tụ điện, 4đ thay số tính điện dung, 2đ kết luận..."
                            className="w-full p-3 border rounded-xl bg-white outline-none text-sm h-20"
                          />
                        </div>

                        <div className="flex flex-wrap gap-4 items-center pt-2">
                          <label className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl cursor-pointer text-xs font-bold transition-all flex items-center gap-2">
                            <Upload className="w-4 h-4"/> Tải tệp tài liệu / Phiếu bài
                            <input type="file" className="hidden" onChange={(e) => handleUploadFile(e, act.id)} />
                          </label>
                          {act.document_url && (
                            <a href={privateFileHref(act.document_url)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-xs font-semibold flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" /> Xem tệp tài liệu hiện tại
                            </a>
                          )}
                          <button type="submit" className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2">
                            <Save className="w-4 h-4"/> Lưu thay đổi
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Xác nhận Gộp bài */}
            {showMergeModal && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Merge className="w-5 h-5 text-indigo-600" /> Xác nhận gộp {selectedActsToMerge.length} bài học
                    </h3>
                    <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Các bài học được chọn: <strong>{selectedActsToMerge.join(", ")}</strong> sẽ được hợp nhất thành 1 bài duy nhất. Các bài tập con sẽ được dọn dẹp và bài nộp của học sinh sẽ được chuyển vào bài mới.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Tên bài sau khi gộp</label>
                      <input
                        value={mergeTitle}
                        onChange={(e) => setMergeTitle(e.target.value)}
                        className="w-full p-3 border rounded-xl outline-none text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả bài gộp (tùy chọn)</label>
                      <textarea
                        value={mergeDesc}
                        onChange={(e) => setMergeDesc(e.target.value)}
                        className="w-full p-3 border rounded-xl outline-none text-sm h-20"
                        placeholder="Nội dung tóm tắt..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowMergeModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      onClick={executeMergeActivities}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      Thực hiện gộp ngay
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. TAB TẠO BÀI TẬP MỚI */}
        {activeTab === 'create_activity' && (
          <div className="space-y-6 max-w-4xl animate-in fade-in">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">Tạo Bài Tập Cá Nhân Mới</h2>
              <p className="text-slate-500 text-sm mt-1">
                Thiết lập bài học, đính kèm video, tải lên tài liệu và cài đặt ma trận điểm (Rubric) cho AI tự động chấm bài.
              </p>
            </div>

            <form onSubmit={handleCreateNewActivity} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Tên bài tập / Hoạt động *
                  </label>
                  <input
                    type="text"
                    value={newActTitle}
                    onChange={(e) => setNewActTitle(e.target.value)}
                    placeholder="Ví dụ: Bài tập Năng lượng và Ghép tụ điện..."
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Hạn chót nộp bài (Deadline)
                  </label>
                  <input
                    type="datetime-local"
                    value={newActDeadline}
                    onChange={(e) => setNewActDeadline(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Mô tả / Yêu cầu chi tiết
                </label>
                <textarea
                  value={newActDesc}
                  onChange={(e) => setNewActDesc(e.target.value)}
                  placeholder="Ghi rõ yêu cầu học sinh cần đạt, số bước giải, các hiện tượng cần giải thích..."
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/50 h-24"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Link Video bài giảng (YouTube/Drive)
                  </label>
                  <input
                    type="url"
                    value={newActVideo}
                    onChange={(e) => setNewActVideo(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Tải tệp tài liệu đính kèm (PDF / DOCX / Ảnh)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setNewActFile(e.target.files?.[0] || null)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 file:font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2 p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" /> Ma trận điểm (Rubric) cho AI tự động chấm
                </label>
                <p className="text-xs text-blue-700">
                  Nhập biểu điểm chi tiết (ví dụ: Nêu công thức 3đ, biến đổi toán học 4đ, kết quả và đơn vị 3đ). AI sẽ dựa trực tiếp vào đây để cho điểm học sinh!
                </p>
                <textarea
                  value={newActRubric}
                  onChange={(e) => setNewActRubric(e.target.value)}
                  placeholder="Thang điểm 10:&#10;- 3đ: Nêu đúng công thức C = ε.S/(9.10^9 . 4π.d)&#10;- 4đ: Thay số và đổi đúng đơn vị (cm -> m, pF -> F)&#10;- 3đ: Kết luận chính xác năng lượng W = 1/2CU^2..."
                  className="w-full p-3.5 border border-blue-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 bg-white h-28"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('activities')}
                  className="px-5 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAct}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {isCreatingAct ? "Đang tạo bài tập..." : "Xác nhận tạo bài tập mới"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 5. TAB BÀI TẬP NHÓM & TÀI LIỆU NHÓM */}
        {activeTab === 'group_assignments' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">Quản lý Bài tập Nhóm</h2>
              <p className="text-slate-500 text-sm mt-1">Tạo bài tập nhóm, đính kèm tài liệu nghiên cứu, ma trận điểm và phân bổ thành viên.</p>
            </div>

            <form onSubmit={createGroupAssignment} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-orange-600" /> Tạo bài tập nhóm mới
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tên bài tập nhóm *</label>
                  <input value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} placeholder="VD: Thuyết trình ứng dụng Tụ điện trong thực tiễn..." className="w-full border p-2.5 rounded-xl text-sm outline-none bg-slate-50/50" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hạn chót nộp bài</label>
                  <input type="datetime-local" value={newGroupDeadline} onChange={e => setNewGroupDeadline(e.target.value)} className="w-full border p-2.5 rounded-xl text-sm outline-none bg-slate-50/50" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả / Yêu cầu nhiệm vụ của các nhóm</label>
                <textarea value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Yêu cầu cụ thể của từng nhóm..." className="w-full border p-2.5 rounded-xl text-sm outline-none bg-slate-50/50 h-20" />
              </div>

              <div className="grid md:grid-cols-2 gap-4 p-4 rounded-2xl bg-orange-50/40 border border-orange-100">
                <div>
                  <label className="text-xs font-bold text-orange-900 block mb-1 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-orange-600" /> Link tệp tài liệu / Đề bài nhóm (Drive / PDF)
                  </label>
                  <input
                    type="url"
                    value={newGroupDocUrl}
                    onChange={e => setNewGroupDocUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full border border-orange-200 p-2.5 rounded-xl text-sm outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-orange-900 block mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-600" /> Ma trận điểm (Rubric) bài nhóm
                  </label>
                  <input
                    type="text"
                    value={newGroupRubric}
                    onChange={e => setNewGroupRubric(e.target.value)}
                    placeholder="VD: 4đ nội dung, 3đ slide, 3đ thuyết trình..."
                    className="w-full border border-orange-200 p-2.5 rounded-xl text-sm outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Số nhóm</label>
                    <input type="number" value={numGroups} onChange={e => setNumGroups(Number(e.target.value))} className="border p-2 rounded-xl w-24 text-sm" min="1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Tối đa SV/Nhóm</label>
                    <input type="number" value={maxStudentsPerGroup} onChange={e => setMaxStudentsPerGroup(Number(e.target.value))} className="border p-2 rounded-xl w-24 text-sm" min="1" />
                  </div>
                </div>
                <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4"/> Tạo bài & Phân nhóm tự động
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {groupAssignments.length === 0 && (
                <div className="bg-white p-12 rounded-3xl text-center text-slate-400 text-sm">
                  Chưa có bài tập nhóm nào được tạo.
                </div>
              )}
              {groupAssignments.map(gAct => (
                <div key={gAct.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${expandedGroupAct === gAct.id ? 'border-orange-400 ring-1 ring-orange-200' : 'border-slate-200'}`}>
                  <div onClick={() => toggleExpandGroupAct(gAct.id)} className="p-5 flex items-center justify-between cursor-pointer bg-slate-50/50 rounded-t-2xl">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-orange-600" /> {gAct.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {gAct.description || "Không có mô tả"} • Hạn: {gAct.deadline ? new Date(gAct.deadline).toLocaleString('vi-VN') : 'Không giới hạn'}
                      </p>
                      {gAct.document_url && (
                        <a href={gAct.document_url} target="_blank" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-blue-600 underline font-semibold mt-1">
                          <ExternalLink className="w-3.5 h-3.5" /> Xem tài liệu đề tài nhóm
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); deleteGroupAssignment(gAct.id); }} className="text-slate-400 hover:text-rose-600 p-2" title="Xóa bài nhóm">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                      <button className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-xl text-xs font-bold">
                        {expandedGroupAct === gAct.id ? "Thu gọn" : "Chi tiết & Chấm điểm"}
                      </button>
                    </div>
                  </div>

                  {expandedGroupAct === gAct.id && (
                    <div className="border-t border-slate-100 p-6 space-y-6">
                      <div>
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-orange-600"/> Danh sách thành viên từng nhóm
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 mb-4 bg-slate-50 p-4 rounded-2xl border">
                          <button onClick={() => createGroupsForAssignment(gAct.id, false)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
                            Phân nhóm theo danh sách
                          </button>
                          <button onClick={() => createGroupsForAssignment(gAct.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                            <Shuffle className="w-4 h-4"/> Chia nhóm ngẫu nhiên
                          </button>
                        </div>
                        <div className="grid md:grid-cols-4 gap-4">
                          {currentGroupMembers.map(g => (
                            <div key={g.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                              <div className="mb-2 flex items-center gap-2 border-b pb-2">
                                {renamingGroupId === g.id ? <><input autoFocus value={groupNameDraft} maxLength={60} onChange={(event) => setGroupNameDraft(event.target.value)} aria-label="Tên nhóm mới" className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-xs" /><button type="button" onClick={() => void renameGroup(g)} className="rounded-lg bg-blue-700 px-2 py-1.5 text-[10px] font-bold text-white">Lưu</button><button type="button" onClick={() => { setRenamingGroupId(null); setGroupNameDraft(""); }} className="rounded-lg border px-2 py-1.5 text-[10px]">Hủy</button></> : <><h5 className="min-w-0 flex-1 truncate font-bold text-sm text-orange-700">{g.group_name || `Nhóm ${g.group_number}`}</h5><button type="button" onClick={() => beginRenameGroup(g)} className="shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Sửa tên</button></>}
                              </div>
                              <ul className="space-y-1.5">
                                {g.group_assignment_members.map((m: any) => (
                                  <li key={m.id} className="text-xs flex items-center gap-2 text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold">
                                      {getAvatar(m.students?.full_name)}
                                    </div>
                                    <span className="truncate">{m.students?.full_name || "Học sinh"}</span>
                                  </li>
                                ))}
                                {g.group_assignment_members.length === 0 && <li className="text-xs text-slate-400 italic">Trống</li>}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-5">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-orange-600"/> Bài nộp từ các nhóm ({currentGroupSubs.length})
                        </h4>
                        <div className="mb-4">
                          <label className="font-bold text-xs text-slate-700 block mb-1">Ma trận chấm điểm nhóm:</label>
                          <div className="flex gap-2">
                            <textarea
                              value={groupRubricText}
                              onChange={e => setGroupRubricText(e.target.value)}
                              className="flex-1 p-2.5 border rounded-xl text-xs h-16 outline-none bg-slate-50/50"
                              placeholder="Nhập tiêu chí chấm điểm nhóm..."
                            />
                            <button onClick={() => saveGroupRubric(gAct.id)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-xl text-xs font-bold">
                              Lưu
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {currentGroupSubs.length === 0 && <p className="text-xs text-slate-400 italic">Chưa có nhóm nào gửi bài nộp.</p>}
                          {currentGroupSubs.map(sub => (
                            <div key={sub.id} className="border rounded-2xl p-4 bg-slate-50/60 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                  <Users className="w-4 h-4 text-orange-600"/> {sub.group_name}
                                </span>
                                <span className="text-xs text-slate-400">{formatTime(sub.submitted_at)}</span>
                              </div>
                              <div className="bg-white p-3 rounded-xl text-xs text-slate-700 border">{sub.answer || "Nộp tệp đính kèm"}</div>
                              {sub.file_url && <a href={privateFileHref(sub.file_url)} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline block font-medium">Xem tệp nộp của nhóm</a>}

                              {sub.ai_score !== null && sub.ai_score !== undefined && (
                                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs space-y-1">
                                  <div className="flex justify-between font-bold text-indigo-900">
                                    <span>AI Đánh giá:</span>
                                    <span>{sub.ai_score}/10</span>
                                  </div>
                                  <p className="text-slate-600">{sub.ai_feedback}</p>
                                </div>
                              )}

                              <div className="flex gap-2 items-center pt-1">
                                <button
                                  onClick={() => gradeGroupWithAI(sub.id, sub.answer)}
                                  disabled={gradingId === sub.id}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex gap-1 items-center"
                                >
                                  <Bot className="w-3.5 h-3.5"/> {gradingId === sub.id ? "Đang chấm..." : "AI Chấm nhóm"}
                                </button>
                                <input type="number" placeholder="Điểm" className="border p-2 rounded-xl w-20 text-xs bg-white" id={`gscore-${sub.id}`} defaultValue={sub.ai_score ?? ""} />
                                <input type="text" placeholder="Góp ý cho nhóm..." className="border p-2 rounded-xl flex-1 text-xs bg-white" id={`gfb-${sub.id}`} defaultValue={sub.ai_feedback || ""} />
                                <button
                                  onClick={async () => {
                                    await supabase.from('group_submissions').update({
                                      ai_score: Number((document.getElementById(`gscore-${sub.id}`) as HTMLInputElement).value),
                                      ai_feedback: (document.getElementById(`gfb-${sub.id}`) as HTMLInputElement).value,
                                      status: 'graded'
                                    }).eq('id', sub.id);
                                    fetchData();
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl"
                                  title="Lưu điểm"
                                >
                                  <CheckCircle className="w-4 h-4"/>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. TAB CHẤM ĐIỂM CÁ NHÂN */}
        {activeTab === 'grading' && (
          <div className="flex flex-col lg:flex-row gap-6 max-w-7xl h-[85vh] animate-in fade-in">
            <div className="w-full lg:w-80 bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col shrink-0">
              <div className="p-4 border-b font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>Chọn Bài tập cần chấm</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{activities.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {activities.map(act => (
                  <button
                    key={act.id}
                    onClick={() => { setSelectedGradingAct(act); setRubricText(act.grading_rubric || ""); }}
                    className={`w-full text-left p-3 rounded-2xl transition-all ${
                      selectedGradingAct?.id === act.id ? 'bg-blue-600 text-white font-bold shadow-md' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">Bài {act.id}: {act.title}</span>
                    <span className="text-[11px] opacity-80 block truncate">{act.description || "Tự luận"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden">
              {selectedGradingAct ? (
                <>
                  <div className="p-4 border-b bg-slate-50 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h2 className="font-extrabold text-base text-slate-900">
                        Bài {selectedGradingAct.id}: {selectedGradingAct.title}
                      </h2>
                      <p className="text-xs text-slate-500">Tổng cộng {currentSubmissions.length} bài đã nộp từ học sinh</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={exportScores} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <Download className="w-3.5 h-3.5" /> Xuất bảng điểm Excel
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border-b bg-blue-50/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" /> Ma trận điểm (Rubric) cho bài này:
                      </label>
                      <label className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-1 rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-1">
                        <Upload className="w-3 h-3"/> Tải tệp ma trận (.txt, .md)
                        <input type="file" accept=".txt,.md,.csv" onChange={handleRubricFileUpload} className="hidden" />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={rubricText}
                        onChange={e => setRubricText(e.target.value)}
                        className="flex-1 p-2.5 border rounded-xl text-xs h-16 outline-none bg-white font-sans"
                        placeholder="Nhập tiêu chí chấm điểm (ví dụ: Nêu đúng công thức 4đ, thay số 4đ, kết luận 2đ)..."
                      />
                      <button onClick={saveRubric} className="bg-slate-900 hover:bg-black text-white px-4 rounded-xl text-xs font-bold shrink-0">
                        Lưu ma trận
                      </button>
                    </div>
                    {rubricFileName && <p className="text-[11px] text-blue-600 font-medium">Tệp đã nạp: {rubricFileName}</p>}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {currentSubmissions.length === 0 && (
                      <div className="text-center py-16 text-slate-400 text-xs">
                        Chưa có học sinh nào nộp bài số {selectedGradingAct.id}.
                      </div>
                    )}
                    {currentSubmissions.map(sub => (
                      <div key={sub.id} className="border border-slate-200/90 rounded-2xl p-4 shadow-sm bg-white space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                              {getAvatar(sub.student_name)}
                            </div>
                            {sub.student_name}
                          </span>
                          <span className="text-xs text-slate-400">{formatTime(sub.submitted_at)}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 whitespace-pre-line border border-slate-100">
                          {sub.answer || "Nộp tệp đính kèm"}
                        </div>
                        {sub.file_url && (
                          <a href={privateFileHref(sub.file_url)} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline font-semibold flex items-center gap-1">
                            <ExternalLink className="w-3.5 h-3.5" /> Xem tệp bài làm đính kèm
                          </a>
                        )}

                        {sub.ai_score !== null && sub.ai_score !== undefined && (
                          <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 p-3.5 rounded-xl border border-indigo-100 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-indigo-900 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Kết quả chấm AI:
                              </span>
                              <span className="text-sm text-indigo-700">{sub.ai_score}/10</span>
                            </div>
                            {sub.ai_feedback && <p className="text-slate-700">{sub.ai_feedback}</p>}
                            {sub.ai_strengths && <p className="text-emerald-700"><span className="font-semibold">Điểm mạnh:</span> {sub.ai_strengths}</p>}
                            {sub.ai_weaknesses && <p className="text-amber-700"><span className="font-semibold">Cần cải thiện:</span> {sub.ai_weaknesses}</p>}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 items-center pt-1">
                          <button
                            onClick={() => gradeWithAI(sub.id, sub.answer)}
                            disabled={gradingId === sub.id}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex gap-1.5 items-center transition-all disabled:opacity-50"
                          >
                            <Bot className="w-3.5 h-3.5"/> {gradingId === sub.id ? "Đang chấm AI..." : "AI Chấm lại"}
                          </button>
                          <input type="number" placeholder="Điểm" className="border p-2 rounded-xl w-20 text-xs bg-slate-50" id={`score-${sub.id}`} defaultValue={sub.ai_score ?? ""} />
                          <input type="text" placeholder="Nhận xét của cô..." className="border p-2 rounded-xl flex-1 text-xs bg-slate-50" id={`fb-${sub.id}`} defaultValue={sub.ai_feedback || ""} />
                          <button
                            onClick={async () => {
                              await supabase.from('submissions').update({
                                ai_score: Number((document.getElementById(`score-${sub.id}`) as HTMLInputElement).value),
                                ai_feedback: (document.getElementById(`fb-${sub.id}`) as HTMLInputElement).value,
                                status: 'graded'
                              }).eq('id', sub.id);
                              fetchData();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl shadow-sm"
                            title="Lưu điểm & nhận xét"
                          >
                            <CheckCircle className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p>Chọn một bài tập từ danh sách bên trái để chấm điểm.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. TAB CHẤM TỪ ẢNH (AI OCR) & LƯU DB */}
        {activeTab === 'ocr' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">Chấm điểm từ Ảnh (AI OCR)</h2>
              <p className="text-slate-500 text-sm mt-1">
                Tải lên ảnh chụp bài thi hoặc bài tập viết tay của học sinh, AI sẽ trích xuất văn bản + công thức LaTeX và chấm điểm theo ma trận. Sau đó có thể lưu trực tiếp vào cơ sở dữ liệu.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Gán cho học sinh:
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={ocrStudentName}
                        onChange={(e) => setOcrStudentName(e.target.value)}
                        className="flex-1 p-2.5 border rounded-xl text-xs bg-slate-50/50"
                      >
                        <option value="">-- Chọn học sinh trong lớp --</option>
                        {students.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
                      </select>
                      <input
                        type="text"
                        value={ocrStudentName}
                        onChange={(e) => setOcrStudentName(e.target.value)}
                        placeholder="Hoặc gõ tên..."
                        className="w-36 p-2.5 border rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Bài học liên quan:
                    </label>
                    <select
                      value={ocrActivityId}
                      onChange={(e) => setOcrActivityId(Number(e.target.value))}
                      className="w-full p-2.5 border rounded-xl text-xs bg-slate-50/50"
                    >
                      {activities.map(a => <option key={a.id} value={a.id}>Bài {a.id}: {a.title}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Ma trận điểm (Rubric) cho bài thi này:
                    </label>
                    <textarea
                      value={ocrRubric}
                      onChange={e => setOcrRubric(e.target.value)}
                      className="w-full p-3 border rounded-xl text-xs h-28 outline-none bg-slate-50/50"
                      placeholder="VD: 3đ nêu định nghĩa, 4đ công thức và thay số, 3đ đơn vị..."
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Tải ảnh bài thi học sinh
                  </label>
                  <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 rounded-2xl p-8 text-center cursor-pointer relative transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOcrImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Camera className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-purple-900">Bấm để chọn ảnh bài làm (JPG, PNG)</p>
                    <p className="text-xs text-purple-600 mt-1">Hệ thống AI tự động trích xuất chữ viết tay và công thức</p>
                  </div>

                  {isOcrProcessing && (
                    <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-700 font-semibold flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-purple-600" /> Đang nhận diện chữ và công thức từ ảnh...
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Văn bản trích xuất từ ảnh (Có thể chỉnh sửa nếu cần):
                </label>
                <textarea
                  value={ocrText}
                  onChange={e => setOcrText(e.target.value)}
                  className="w-full p-4 border rounded-2xl text-xs h-36 outline-none bg-slate-50/50 leading-relaxed font-mono"
                  placeholder="Văn bản nhận diện từ ảnh bài thi sẽ xuất hiện ở đây..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={executeOcrGrading}
                  disabled={isOcrProcessing || !ocrText.trim()}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Chấm điểm bài này bằng AI
                </button>
              </div>

              {ocrResult && (
                <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-purple-200">
                    <span className="text-sm font-bold text-purple-900">KẾT QUẢ CHẤM ĐIỂM AI:</span>
                    <span className="text-2xl font-black text-purple-700">{ocrResult.score}/10</span>
                  </div>
                  <p className="text-xs text-slate-800"><span className="font-bold">Nhận xét:</span> {ocrResult.feedback}</p>
                  {ocrResult.strengths && <p className="text-xs text-emerald-800"><span className="font-bold">Ưu điểm:</span> {ocrResult.strengths}</p>}
                  {ocrResult.weaknesses && <p className="text-xs text-amber-800"><span className="font-bold">Hạn chế:</span> {ocrResult.weaknesses}</p>}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={saveOcrSubmissionToDB}
                      disabled={isSavingOcr}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingOcr ? "Đang lưu vào hệ thống..." : "Lưu kết quả này vào Bảng điểm Học sinh"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. TAB CHẤM LẠI BÀI LỖI */}
        {activeTab === 'regrade' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div>
              <h2 className="text-3xl font-extrabold text-amber-600">Chấm lại Bài nộp AI Lỗi / Chưa chấm</h2>
              <p className="text-slate-500 text-sm mt-1">Danh sách các bài làm có điểm AI = -1 hoặc chưa có điểm. Giáo viên có thể chấm thủ công hoặc kích hoạt lại AI.</p>
            </div>

            <div className="space-y-3">
              {submissions.filter(s => s.ai_score === null || s.ai_score === -1).length === 0 ? (
                <div className="bg-white p-12 rounded-3xl text-center text-slate-400 text-sm">
                  🎉 Tuyệt vời! Không có bài nào bị lỗi hoặc tồn đọng chưa chấm.
                </div>
              ) : (
                submissions.filter(s => s.ai_score === null || s.ai_score === -1).map(sub => (
                  <div key={sub.id} className="bg-white border rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-sm">{sub.student_name} (Bài {sub.activity_id})</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">Cần chấm lại</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 border">{sub.answer || "Nộp tệp đính kèm"}</div>
                    <div className="flex gap-2 items-center pt-1">
                      <button
                        onClick={() => gradeWithAI(sub.id, sub.answer)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex gap-1 items-center"
                      >
                        <Bot className="w-3.5 h-3.5" /> AI Chấm lại
                      </button>
                      <input type="number" placeholder="Điểm" className="border p-2 rounded-xl w-20 text-xs bg-slate-50" id={`rescore-${sub.id}`} defaultValue={sub.ai_score ?? ""} />
                      <input type="text" placeholder="Nhận xét..." className="border p-2 rounded-xl flex-1 text-xs bg-slate-50" id={`refb-${sub.id}`} defaultValue={sub.ai_feedback || ""} />
                      <button
                        onClick={async () => {
                          await supabase.from('submissions').update({
                            ai_score: Number((document.getElementById(`rescore-${sub.id}`) as HTMLInputElement).value),
                            ai_feedback: (document.getElementById(`refb-${sub.id}`) as HTMLInputElement).value,
                            status: 'graded'
                          }).eq('id', sub.id);
                          fetchData();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl"
                        title="Xác nhận điểm"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 9. TAB SINH VIÊN */}
        {activeTab === 'students' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900">Danh sách Học sinh ({students.length})</h2>
                <p className="text-slate-500 text-sm mt-1">Quản lý tài khoản học sinh, thêm từng em hoặc nhập hàng loạt từ Excel.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <form onSubmit={addStudentManual} className="bg-white p-5 rounded-2xl border shadow-sm flex gap-2">
                <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Nhập họ và tên học sinh mới..." className="flex-1 border p-2.5 rounded-xl text-sm outline-none bg-slate-50/50" required />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold">Thêm ngay</button>
              </form>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Nhập danh sách từ Excel (.xlsx):</span>
                <input type="file" accept=".xlsx" onChange={handleExcelUpload} className="text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 file:font-semibold" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm tên học sinh..." className="w-full pl-11 pr-4 py-3 border rounded-xl bg-slate-50/50 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {students.filter(s => s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <div key={s.id} className="bg-slate-50 border px-3.5 py-2.5 rounded-xl text-xs font-bold flex justify-between items-center group">
                    <span className="truncate">{s.full_name}</span>
                    <button onClick={() => deleteStudent(s.id)} className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 10. TAB TẠO TRẮC NGHIỆM & AI SINH ĐỀ */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6 max-w-4xl animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-7 h-7 text-indigo-600" /> Tạo Trắc Nghiệm & AI Sinh Đề Thi
                </h2>
                <p className="text-slate-500 text-sm mt-1">Soạn câu hỏi thủ công hoặc ra lệnh cho AI biên soạn bộ câu hỏi hoàn chỉnh chỉ trong 5 giây.</p>
              </div>
            </div>

            {/* KHỐI AI GENERATE QUIZ */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-purple-50/50 border border-indigo-200/80 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-indigo-950">Biên soạn bộ câu hỏi tự động bằng AI (Gemini)</h3>
                  <p className="text-[11px] text-indigo-700">Nhập chủ đề kiến thức, AI sẽ tự tạo câu hỏi kèm 4 phương án, đáp án đúng và lời giải LaTeX.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <input
                    value={aiQuizTopic}
                    onChange={(e) => setAiQuizTopic(e.target.value)}
                    placeholder="Chủ đề: Tụ điện phẳng, điện dung, ghép nối tiếp/song song..."
                    className="w-full p-2.5 rounded-xl border border-indigo-200 bg-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={aiQuizCount}
                    onChange={(e) => setAiQuizCount(Number(e.target.value))}
                    className="p-2.5 rounded-xl border border-indigo-200 bg-white text-xs outline-none"
                  >
                    <option value={3}>3 câu</option>
                    <option value={4}>4 câu</option>
                    <option value={5}>5 câu</option>
                    <option value={8}>8 câu</option>
                  </select>
                  <button
                    onClick={handleGenerateQuizWithAI}
                    disabled={isGeneratingQuiz}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingQuiz ? "Đang tạo đề..." : "Sinh câu hỏi AI"}
                  </button>
                </div>
              </div>
            </div>

            {/* FORM LƯU BÀI TRẮC NGHIỆM */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border space-y-5">
              <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} placeholder="Tiêu đề bài trắc nghiệm (VD: Kiểm tra 15 phút Tụ điện)..." className="w-full border p-3 rounded-xl text-sm outline-none bg-slate-50/50 font-bold" />

              <div className="flex gap-4">
                <select value={quizActivity} onChange={e => setQuizActivity(Number(e.target.value))} className="border p-2.5 rounded-xl flex-1 text-xs bg-slate-50/50 outline-none">
                  {activities.map(a => <option key={a.id} value={a.id}>Gắn với Bài {a.id}: {a.title}</option>)}
                </select>
                <input type="number" value={quizTime} onChange={e => setQuizTime(Number(e.target.value))} className="border p-2.5 rounded-xl w-36 text-xs bg-slate-50/50 outline-none" placeholder="Thời gian (phút)" />
              </div>

              {newQs.map((q, idx) => (
                <div key={idx} className="border p-5 rounded-2xl bg-slate-50/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-blue-700">Câu hỏi số {idx + 1}</span>
                    {newQs.length > 1 && (
                      <button onClick={() => setNewQs(newQs.filter((_, i) => i !== idx))} className="text-rose-500 text-xs">Xóa câu này</button>
                    )}
                  </div>
                  <input value={q.question} onChange={e => { const n = [...newQs]; n[idx].question = e.target.value; setNewQs(n); }} placeholder={`Nhập nội dung câu hỏi ${idx + 1}...`} className="w-full border p-2.5 rounded-xl text-xs bg-white outline-none" />
                  <input value={q.image_url} onChange={e => { const n = [...newQs]; n[idx].image_url = e.target.value; setNewQs(n); }} placeholder="Link ảnh minh họa (nếu có)..." className="w-full border p-2 rounded-xl text-xs bg-white outline-none" />

                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2 bg-white p-2 border rounded-xl">
                        <input type="radio" name={`correct-${idx}`} checked={q.correct_option === oIdx} onChange={() => { const n = [...newQs]; n[idx].correct_option = oIdx; setNewQs(n); }} />
                        <input value={opt} onChange={e => { const n = [...newQs]; n[idx].options[oIdx] = e.target.value; setNewQs(n); }} placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`} className="w-full border-0 text-xs outline-none" />
                      </div>
                    ))}
                  </div>
                  <textarea value={q.explanation} onChange={e => { const n = [...newQs]; n[idx].explanation = e.target.value; setNewQs(n); }} placeholder="Lời giải chi tiết cho câu hỏi này..." className="w-full border p-2 rounded-xl text-xs bg-white outline-none h-16" />
                </div>
              ))}

              <div className="flex gap-3">
                <button onClick={() => setNewQs([...newQs, { question: "", image_url: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }])} className="px-4 py-2.5 border border-blue-600 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50">
                  + Thêm câu hỏi tiếp theo
                </button>
                <button onClick={createQuiz} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-md">
                  Lưu bài trắc nghiệm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 11. TAB KÊNH THẢO LUẬN */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-[80vh] flex flex-col max-w-4xl mx-auto overflow-hidden animate-in fade-in">
            <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="font-bold text-sm">Kênh thảo luận lớp học 11A1</h2>
                <p className="text-[11px] text-slate-400">Trao đổi giữa Giáo viên và Sinh viên</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await supabase.from('chat_settings').update({ is_muted: !isChatMuted }).eq('id', 1);
                    fetchData();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isChatMuted ? 'bg-emerald-600' : 'bg-amber-600'}`}
                >
                  {isChatMuted ? "Mở khóa chat" : "Khóa chat học sinh"}
                </button>
              </div>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map(m => {
                const isTeacher = m.sender_name?.includes('Cô') || m.sender_name?.includes('Giáo viên');
                return (
                  <div key={m.id} className={`flex gap-3 group ${isTeacher ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${isTeacher ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                      {getAvatar(m.sender_name)}
                    </div>
                    <div className={`p-3.5 rounded-2xl max-w-[70%] text-xs shadow-sm ${isTeacher ? 'bg-blue-600 text-white' : 'bg-white border text-slate-800'}`}>
                      <p className={`font-bold text-[10px] mb-1 ${isTeacher ? 'text-blue-200' : 'text-slate-400'}`}>
                        {m.sender_name} • {formatTime(m.created_at)}
                      </p>
                      <p className="leading-relaxed">{m.content}</p>
                      {m.attachment_url && (m.attachment_type?.startsWith("image/") ? <a href={privateFileHref(m.attachment_url)} target="_blank" rel="noreferrer"><Image unoptimized width={800} height={600} src={privateFileHref(m.attachment_url)} alt={m.attachment_name || "Tệp ảnh"} className="mt-2 max-h-64 rounded-xl object-contain" /></a> : <a href={privateFileHref(m.attachment_url)} target="_blank" rel="noreferrer" className="mt-2 block underline">📎 {m.attachment_name || "Tải tệp đính kèm"}</a>)}<button onClick={() => deleteMessage(m)} className="mt-2 block text-[10px] opacity-70 hover:opacity-100">Xóa tin nhắn</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
              <input type="file" onChange={(e) => setChatFile(e.target.files?.[0] || null)} className="max-w-32 text-[10px]" aria-label="Đính kèm tệp hoặc ảnh" /><input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập tin nhắn hướng dẫn học sinh..." className="flex-1 border p-3 rounded-xl text-xs outline-none bg-slate-50/50" /><button type="button" onClick={() => setChatFile(null)} className="text-xs">{chatFile?.name || ""}</button>
              <button type="submit" disabled={isSendingChat || (!newMsg.trim() && !chatFile)} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Send className="w-4 h-4"/> Gửi
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
