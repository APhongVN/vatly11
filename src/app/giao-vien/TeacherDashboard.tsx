"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { CHAT_ATTACHMENT_ACCEPT, chatAttachmentMimeType, isInlineChatImage, MAX_CHAT_ATTACHMENT_BYTES } from "@/lib/chat-attachments.mjs";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ExcelJS from "exceljs";
import { countAwaitingTeacherReview } from "@/lib/report-metrics.mjs";
import { renameGroupInSubmissions } from "@/lib/group-submissions.mjs";
import { buildClassReportMetrics } from "@/lib/class-report-metrics.mjs";
import {
  LogOut, Home, Video, Users, FileText, Bot, Upload, MessageSquare, Archive, RotateCcw,
  Send, Calendar, Download, CheckCircle, Trash2, ArrowLeft, Search,
  Save, X, Plus, Clock, Layers, BookOpen, Shuffle, RefreshCw, Camera,
  Sparkles, CheckSquare, Square, Merge, AlertTriangle, ExternalLink,
  ChevronRight, LayoutDashboard, PlusCircle, BarChart3, TrendingUp,
  BrainCircuit, Award, Lightbulb, AlertCircle, FileSpreadsheet, ClipboardList, FolderOpen, Menu, HelpCircle
} from "lucide-react";
import { QUESTION_TOPICS, QUESTION_STATUS_IDS } from "@/lib/student-questions.mjs";
import TeacherHome from "@/components/TeacherHome";
import CurriculumManager from "@/components/CurriculumManager";
import ResourceLibrary from "@/components/ResourceLibrary";
import ActivityEvidencePanel from "@/components/ActivityEvidencePanel";
import CapacitanceLabSettings from "@/components/CapacitanceLabSettings";
import RubricEditor from "@/components/RubricEditor";
import QuestionCard from "@/components/TeacherQuestionCard";
import { formatVietnameseName, getFirstName, sortVietnameseNames, isHeaderOrInvalidCell, containsDigit, hasInvalidNameCharacters } from "@/lib/vietnameseName";
import { ACTIVITIES } from "@/lib/data/activities";
import { extractStudentNamesFromText, extractStudentRowsFromText } from "@/lib/student-import.mjs";
import { filterStudentRoster, getStudentClassNames, hasStudentInClass } from "@/lib/student-roster.mjs";
import { splitExcelCellText } from "@/lib/excel-cell-content.mjs";
import { extractRubricFile } from "@/lib/rubric-import.mjs";
import { loadBoundedZip } from "@/lib/zip-limits.mjs";

const privateFileHref = (value: string) => value.startsWith("http") ? value : `/api/files?bucket=${value.startsWith("chat/") || value.startsWith("submissions/") || value.startsWith("group-submissions/") || value.startsWith("group-rubrics/") ? "class-work" : "videos"}&path=${encodeURIComponent(value)}`;
const rubricUploadMimeType = (file: File) => {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase() || "";
  const allowed: Record<string, string> = {
    txt: "text/plain", md: "text/plain", csv: "text/csv", pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
  };
  return allowed[extension] || "application/octet-stream";
};
const isMissingStudentSchemaField = (error: { code?: string } | null) => error?.code === "42703" || error?.code === "PGRST204";

const loadTeacherStudentRoster = async () => {
  const completeRoster = await supabase.from("students")
    .select("id,full_name,class_name,auth_user_id,login_email,username,birth_date,is_active,student_code,password_changed").order("full_name").limit(1000);
  if (!completeRoster.error) {
    return { ...completeRoster, accountFieldsReady: true, accountSchemaMissing: false, archiveSchemaMissing: false };
  }
  if (!isMissingStudentSchemaField(completeRoster.error)) {
    return { ...completeRoster, accountFieldsReady: false, accountSchemaMissing: false, archiveSchemaMissing: false };
  }

  const accountRoster = await supabase.from("students")
    .select("id,full_name,class_name,auth_user_id,login_email,username,birth_date").order("full_name").limit(1000);
  if (!accountRoster.error) {
    return {
      ...accountRoster,
      data: (accountRoster.data || []).map((student) => ({ ...student, is_active: true, student_code: null, password_changed: false })),
      accountFieldsReady: true,
      accountSchemaMissing: false,
      archiveSchemaMissing: true,
    };
  }
  if (!isMissingStudentSchemaField(accountRoster.error)) {
    return { ...accountRoster, accountFieldsReady: false, accountSchemaMissing: false, archiveSchemaMissing: true };
  }

  const archiveRoster = await supabase.from("students")
    .select("id,full_name,class_name,is_active").order("full_name").limit(1000);
  if (!archiveRoster.error) {
    return { ...archiveRoster, accountFieldsReady: false, accountSchemaMissing: true, archiveSchemaMissing: false };
  }
  if (!isMissingStudentSchemaField(archiveRoster.error)) {
    return { ...archiveRoster, accountFieldsReady: false, accountSchemaMissing: true, archiveSchemaMissing: false };
  }

  const legacyRoster = await supabase.from("students").select("id,full_name,class_name").order("full_name").limit(1000);
  return {
    ...legacyRoster,
    data: (legacyRoster.data || []).map((student) => ({ ...student, is_active: true })),
    accountFieldsReady: false,
    accountSchemaMissing: true,
    archiveSchemaMissing: true,
  };
};
const readAllReportRows = async <T,>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
) => {
  const pageSize = 500;
  const maxRows = 50_000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const page = data || [];
    rows.push(...page);
    if (rows.length > maxRows) throw new Error(`${label} có hơn ${maxRows.toLocaleString("vi-VN")} dòng; hãy lọc dữ liệu rồi xuất từng đợt.`);
    if (page.length < pageSize) break;
  }
  return rows;
};

const readAllActivityRubricRows = async () => {
  try {
    return await readAllReportRows((from, to) => supabase.from("activity_grading_guides").select("activity_id,grading_rubric,rubric_document_name").order("activity_id").range(from, to), "Ma trận chấm cá nhân");
  } catch (error) {
    const message = error instanceof Error ? error.message.toLocaleLowerCase() : "";
    if (!message.includes("rubric_document_name") && !message.includes("schema cache")) throw error;
    return readAllReportRows((from, to) => supabase.from("activity_grading_guides").select("activity_id,grading_rubric").order("activity_id").range(from, to), "Ma trận chấm cá nhân");
  }
};

type GradingGuide = {
  activity_id: number;
  model_answer: string | null;
  grading_rubric: string | null;
  rubric_document_path?: string | null;
  rubric_document_name?: string | null;
};

/**
 * The dashboard can be deployed a few minutes before a SQL migration is run.
 * Read the legacy guide shape during that window instead of breaking the whole
 * teacher screen; file import is then explicitly held until migration 027 is on.
 */
const loadTeacherGradingGuides = async (): Promise<{ data: GradingGuide[]; documentFieldsReady: boolean }> => {
  const extended = await supabase
    .from("activity_grading_guides")
    .select("activity_id,model_answer,grading_rubric,rubric_document_path,rubric_document_name");
  if (!extended.error) {
    return { data: (extended.data || []) as GradingGuide[], documentFieldsReady: true };
  }

  if (extended.error.code !== "42703" && extended.error.code !== "PGRST204") {
    console.warn("Không tải được ma trận chấm điểm:", extended.error.message);
    return { data: [], documentFieldsReady: false };
  }

  const legacy = await supabase
    .from("activity_grading_guides")
    .select("activity_id,model_answer,grading_rubric");
  if (legacy.error) {
    console.warn("Không tải được ma trận chấm điểm cũ:", legacy.error.message);
    return { data: [], documentFieldsReady: false };
  }
  return { data: (legacy.data || []) as GradingGuide[], documentFieldsReady: false };
};

export default function GiaoVienPage({ previewMode = false }: { previewMode?: boolean }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigateToTab = (tab: string) => { setActiveTab(tab); setMobileNavOpen(false); };
  const [activities, setActivities] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const activeStudents = students.filter((student) => student.is_active !== false);
  const archivedStudents = students.filter((student) => student.is_active === false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activityEvidence, setActivityEvidence] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<any[]>([]);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [isDeletionBlocked, setIsDeletionBlocked] = useState(false);
  const [studentQuestions, setStudentQuestions] = useState<any[]>([]);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionSaving, setQuestionSaving] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<string>("all");
  const pendingQuestionCount = studentQuestions.filter((q) => q.status === "unanswered").length;
  const questionTopicLabel = (id: string) => QUESTION_TOPICS.find((t: { id: string; label: string }) => t.id === id)?.label || id;
  const questionStatusLabel = (id: string) => (id === "resolved" ? "Đã giải quyết" : id === "answered" ? "Đã trả lời" : "Chưa trả lời");

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
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [rubricImportError, setRubricImportError] = useState("");
  const [isImportingRubric, setIsImportingRubric] = useState(false);
  const [isSavingRubric, setIsSavingRubric] = useState(false);
  const [rubricDocumentSchemaReady, setRubricDocumentSchemaReady] = useState(previewMode);
  const [gradingId, setGradingId] = useState<string | null>(null);

  // Quản lý & Gộp bài tập cá nhân
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [uploadingDocumentActivityId, setUploadingDocumentActivityId] = useState<number | null>(null);
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
  const [newActRubricFile, setNewActRubricFile] = useState<File | null>(null);
  const [newActRubricFileName, setNewActRubricFileName] = useState("");
  const [newActRubricImportError, setNewActRubricImportError] = useState("");
  const [isImportingNewActRubric, setIsImportingNewActRubric] = useState(false);
  const [editRubricText, setEditRubricText] = useState("");
  const [editRubricFile, setEditRubricFile] = useState<File | null>(null);
  const [editRubricFileName, setEditRubricFileName] = useState("");
  const [editRubricImportError, setEditRubricImportError] = useState("");
  const [isImportingEditRubric, setIsImportingEditRubric] = useState(false);
  const [savingActivityId, setSavingActivityId] = useState<number | null>(null);
  const [newActFile, setNewActFile] = useState<File | null>(null);
  const [isCreatingAct, setIsCreatingAct] = useState(false);
  const [newActCourseId, setNewActCourseId] = useState("");
  const [newActChapterId, setNewActChapterId] = useState("");
  const [newActPhase, setNewActPhase] = useState("Trước lớp");
  const [newActType, setNewActType] = useState("Bài tập");
  const [newActDuration, setNewActDuration] = useState("");
  const [newActAcceptingSubmissions, setNewActAcceptingSubmissions] = useState(true);
  const [curriculumCourses, setCurriculumCourses] = useState<any[]>([]);
  const [curriculumChapters, setCurriculumChapters] = useState<any[]>([]);

  // Sinh viên
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentClassName, setStudentClassName] = useState("11A1");
  const [studentClassFilter, setStudentClassFilter] = useState("");
  const [showArchivedStudents, setShowArchivedStudents] = useState(false);
  const [studentArchiveBusyId, setStudentArchiveBusyId] = useState<string | null>(null);
  const [importPreviewNames, setImportPreviewNames] = useState<string[]>([]);
const [importPreviewCodes, setImportPreviewCodes] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pasteNamesText, setPasteNamesText] = useState("");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [isSavingStudents, setIsSavingStudents] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [accountStudent, setAccountStudent] = useState<any>(null);
  const [detailStudent, setDetailStudent] = useState<any>(null);
  const [studentAccountCredentials, setStudentAccountCredentials] = useState<Array<{ username: string; password: string; studentName: string }> | null>(null);
  const [studentAccountError, setStudentAccountError] = useState("");
  const [studentAccountNotice, setStudentAccountNotice] = useState("");
  const [isCreatingStudentAccount, setIsCreatingStudentAccount] = useState(false);
  const [canProvisionStudentAccounts, setCanProvisionStudentAccounts] = useState(false);
  const [studentAccountSchemaMissing, setStudentAccountSchemaMissing] = useState(false);
  const [studentArchiveSchemaMissing, setStudentArchiveSchemaMissing] = useState(false);

  // Quản lý bài tập nhóm
  const [groupAssignments, setGroupAssignments] = useState<any[]>([]);
  const [expandedGroupAct, setExpandedGroupAct] = useState<string | null>(null);
  const [regroupingAssignmentId, setRegroupingAssignmentId] = useState<string | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupDeadline, setNewGroupDeadline] = useState("");
  const [newGroupDocUrl, setNewGroupDocUrl] = useState("");
  const [newGroupRubric, setNewGroupRubric] = useState("");
  const [newGroupClassName, setNewGroupClassName] = useState("__choose__");
  const [numGroups, setNumGroups] = useState(4);
  const [maxStudentsPerGroup, setMaxStudentsPerGroup] = useState(6);
  const [currentGroupMembers, setCurrentGroupMembers] = useState<any[]>([]);
  const [groupDetailsError, setGroupDetailsError] = useState("");
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupRubricText, setGroupRubricText] = useState("");
  const [groupRubricFile, setGroupRubricFile] = useState<File | null>(null);
  const [groupRubricFileName, setGroupRubricFileName] = useState("");
  const [groupRubricImportError, setGroupRubricImportError] = useState("");
  const [isImportingGroupRubric, setIsImportingGroupRubric] = useState(false);
  const [groupRubricDocumentSchemaReady, setGroupRubricDocumentSchemaReady] = useState(false);
  const [groupRubricAssignmentId, setGroupRubricAssignmentId] = useState<string | null>(null);
  const [loadingGroupDetailsId, setLoadingGroupDetailsId] = useState<string | null>(null);
  const groupDetailsRequestRef = useRef(0);
  const previewGroupSequence = useRef(0);
  const [savingGroupRubricId, setSavingGroupRubricId] = useState<string | null>(null);
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
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [reportExportError, setReportExportError] = useState("");
  const [reportExportSuccess, setReportExportSuccess] = useState("");
  const [previewNotice, setPreviewNotice] = useState("");
  const [dataLoadIssues, setDataLoadIssues] = useState<string[]>([]);
  const readRubricFile = (file: File) => extractRubricFile(file, previewMode ? async () => {
    setPreviewNotice(`OCR đang mô phỏng cho “${file.name}”; ảnh không được gửi tới Gemini trong chế độ xem tự do.`);
    return `[OCR mô phỏng cho ${file.name}. Nội dung thật sẽ được nhận dạng trong phiên giáo viên.]`;
  } : undefined);

  const fetchData = useCallback(async () => {
    if (previewMode) {
      setDataLoadIssues([]);
      setCanProvisionStudentAccounts(false);
      setStudentAccountSchemaMissing(false);
      setStudentArchiveSchemaMissing(false);
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
      setRubricDocumentSchemaReady(true);
      setCurriculumCourses([{ id: "preview-course-tu-dien", title: "Vật lí 11", subject: "Vật lí", grade_level: 11 }]);
      setCurriculumChapters([{ id: "preview-chapter-tu-dien", course_id: "preview-course-tu-dien", title: "Chuyên đề Tụ điện" }]);
      return;
    }
    try {
      const [
        { data: acts, error: activitiesError },
        { data: studs, error: studentsError, accountFieldsReady, accountSchemaMissing, archiveSchemaMissing },
        { data: subs, error: submissionsError },
        { data: msgs, error: messagesError },
        { data: qzs, error: quizzesError },
        { data: setting, error: chatSettingsError },
        { data: gActs, error: groupAssignmentsError },
        { data: gSubs, error: groupSubmissionsError },
        guideResult,
        { data: courseRows, error: coursesError },
        { data: chapterRows, error: chaptersError },
      ] = await Promise.all([
        supabase.from('activities').select('*').order('id').limit(300),
        loadTeacherStudentRoster(),
        supabase.from('submissions').select('*').order('submitted_at', { ascending: false }).limit(300),
        supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('quizzes').select('*').order('id').limit(300),
        supabase.from('chat_settings').select('is_muted,deletion_blocked').eq('id', 1).single(),
        supabase.from('group_assignments').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('group_submissions').select('*').order('submitted_at', { ascending: false }).limit(300),
        loadTeacherGradingGuides(),
        supabase.from('courses').select('id,title,subject,grade_level').order('grade_level').order('title').limit(200),
        supabase.from('chapters').select('id,course_id,title').order('created_at').limit(500),
      ]);

      const failedSections: string[] = [];
      if (activitiesError) failedSections.push("bài học");
      if (studentsError) failedSections.push("danh sách học sinh");
      if (submissionsError) failedSections.push("bài nộp");
      if (messagesError) failedSections.push("kênh chat");
      if (quizzesError) failedSections.push("bộ câu hỏi");
      if (chatSettingsError) failedSections.push("cài đặt chat");
      if (groupAssignmentsError) failedSections.push("bài tập nhóm");
      if (groupSubmissionsError) failedSections.push("bài nộp nhóm");
      if (coursesError) failedSections.push("môn học");
      if (chaptersError) failedSections.push("chương học");
      setDataLoadIssues(failedSections);

      setCanProvisionStudentAccounts(accountFieldsReady === true);
      setStudentAccountSchemaMissing(accountSchemaMissing === true);
      setStudentArchiveSchemaMissing(archiveSchemaMissing === true);
      setRubricDocumentSchemaReady(guideResult.documentFieldsReady);

      if (acts) {
        const guidesByActivity = new Map(guideResult.data.map((guide) => [guide.activity_id, guide]));
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
      const { data: quizSubs } = await supabase.from("quiz_submissions").select("id,quiz_id,student_id,score,created_at,time_spent_seconds,students(full_name,class_name)").order("created_at", { ascending: false }).limit(2000);
      if (quizSubs) setQuizSubmissions(quizSubs);
      const { data: evidenceRows } = await supabase.from("activity_evidence").select("id,student_id,activity_id,score,score_max,completed_at,teacher_score,teacher_feedback,graded_at,updated_at,ai_score,ai_feedback").order("updated_at", { ascending: false }).limit(3000);
      if (evidenceRows) setActivityEvidence(evidenceRows);
      if (setting) { setIsChatMuted(setting.is_muted); setIsDeletionBlocked(Boolean((setting as any).deletion_blocked)); }
      if (gActs) setGroupAssignments(gActs);
      if (gSubs) setGroupSubmissions(gSubs);
      if (courseRows) setCurriculumCourses(courseRows);
      if (chapterRows) setCurriculumChapters(chapterRows);
    } catch (err) {
      console.warn("Lỗi tải dữ liệu giáo viên:", err);
      setDataLoadIssues(["kết nối Supabase"]);
    }
  }, [previewMode, selectedGradingAct, setIsChatMuted, setIsDeletionBlocked]);

  const loadStudentQuestions = async () => {
    if (previewMode) {
      setStudentQuestions([
        { id: "demo-question-1", students: { full_name: "Nguyễn Minh Anh", class_name: "11A1" }, topic: "capacitance", content: "Cô ơi, điện dung có phụ thuộc vào hiệu điện thế không ạ?", status: "unanswered", teacher_response: null, created_at: new Date().toISOString() },
        { id: "demo-question-2", students: { full_name: "Trần Gia Bảo", class_name: "11A1" }, topic: "energy", content: "Năng lượng tụ điện tính bằng công thức nào ạ?", status: "answered", teacher_response: "Em xem lại phần III và công thức W = 1/2 C U² nhé.", created_at: new Date().toISOString() },
      ]);
      return;
    }
    setQuestionLoading(true);
    try {
      const response = await fetch("/api/student-questions", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      setStudentQuestions(Array.isArray(result.questions) ? result.questions : []);
    } catch {
      // Không chặn bảng điều khiển nếu route hỏi đáp tạm lỗi.
    } finally {
      setQuestionLoading(false);
    }
  };

  const respondToQuestion = async (questionId: string, response: string, nextStatus: string) => {
    if (previewMode) {
      setStudentQuestions((current) => current.map((q) => q.id === questionId ? { ...q, teacher_response: response, status: nextStatus } : q));
      return;
    }
    setQuestionSaving(questionId);
    try {
      const payload: Record<string, string> = { status: nextStatus };
      if (response.trim()) payload.teacher_response = response;
      const res = await fetch(`/api/student-questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Không lưu được phản hồi.");
      await loadStudentQuestions();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không lưu được phản hồi.");
    } finally {
      setQuestionSaving(null);
    }
  };

  // 4.7 Gợi ý AI: chỉ giáo viên gọi; kết quả chỉ điền vào ô phản hồi để giáo viên
  // kiểm tra và chỉnh sửa trước khi gửi phản hồi chính thức.
  const suggestQuestionAnswer = async (questionId: string): Promise<string | null> => {
    const question = studentQuestions.find((item) => item.id === questionId);
    if (!question) return null;
    if (previewMode) return "Gợi ý mẫu: hãy xem lại phần kiến thức liên quan rồi trả lời lại em.";
    try {
      const res = await fetch("/api/student-questions/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.content, topic: questionTopicLabel(question.topic) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Không đề xuất được câu trả lời.");
      return result.suggestion || null;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không đề xuất được câu trả lời.");
      return null;
    }
  };

  useEffect(() => {
    if (previewMode) { void fetchData(); return; }
    void fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, previewMode]);

  useEffect(() => {
    void loadStudentQuestions();
    if (previewMode) return;
    const timer = window.setInterval(() => void loadStudentQuestions(), 45000);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode]);

  useEffect(() => {
    if (previewMode) return;
    const refreshMessages = async () => {
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100);
      if (data) setMessages([...data].reverse());
    };
    const channel = supabase.channel("class-chat-teacher")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void refreshMessages())
      .subscribe();
    const timer = window.setInterval(() => void refreshMessages(), 30000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [previewMode]);
  const handleLogout = async () => {
    if (previewMode) { router.push("/"); return; }
    localStorage.removeItem('teacher_session');
    await supabase.auth.signOut();
    router.replace("/giao-vien");
  };

  // --- QUẢN LÝ BÀI HỌC CÁ NHÂN & GỘP BÀI ---
  const saveActivity = async (id: number, e: React.FormEvent) => {
    e.preventDefault();
    if (savingActivityId === id || isImportingEditRubric) return;
    const form = e.target as HTMLFormElement;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const desc = (form.elements.namedItem('desc') as HTMLInputElement).value;
    const video = (form.elements.namedItem('video') as HTMLInputElement).value;
    const deadline = (form.elements.namedItem('deadline') as HTMLInputElement).value;
    const rubric = editRubricText.trim();
    const acceptingSubmissions = (form.elements.namedItem('accepting_submissions') as HTMLInputElement).checked;
    if (editRubricFile && !rubricDocumentSchemaReady && !previewMode) {
      alert("Cần áp dụng migration 20261031002700_rubric_document_import.sql trước khi lưu file gốc ma trận.");
      return;
    }
    if (rubric.length > 20_000) { alert("Ma trận chấm điểm tối đa 20.000 ký tự."); return; }
    if (previewMode) {
      setActivities((current) => current.map((activity) => activity.id === id ? {
        ...activity, title, description: desc, video_url: video || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        grading_rubric: rubric || null, rubric_document_name: editRubricFile?.name || activity.rubric_document_name || null,
        accepting_submissions: acceptingSubmissions,
      } : activity));
      setExpandedAct(null);
      setPreviewNotice(`Đã lưu thử thay đổi của bài ${id} trong phiên xem trước.`);
      return;
    }
    setSavingActivityId(id);
    const activity = activities.find((item) => item.id === id);
    const oldPath = activity?.rubric_document_path || null;
    let uploadedRubricPath: string | null = null;
    let activityUpdated = false;
    try {
      if (editRubricFile) {
        const safeName = editRubricFile.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 150) || "rubric";
        uploadedRubricPath = `rubrics/activity-${id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("learning-resources").upload(uploadedRubricPath, editRubricFile, { contentType: rubricUploadMimeType(editRubricFile), upsert: false });
        if (uploadError) throw new Error("Không tải được file ma trận: " + uploadError.message);
      }

      const activityPayload = {
        title,
        description: desc,
        video_url: video,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        accepting_submissions: acceptingSubmissions,
      };
      const { error } = await supabase.from("activities").update(activityPayload).eq("id", id);
      if (error) throw new Error("Không lưu được bài học: " + error.message);
      activityUpdated = true;

      const guidePayload: Record<string, string | number | null> = {
        activity_id: id,
        model_answer: activity?.model_answer || null,
        grading_rubric: rubric || null,
      };
      if (rubricDocumentSchemaReady) {
        guidePayload.rubric_document_path = uploadedRubricPath || oldPath;
        guidePayload.rubric_document_name = editRubricFile?.name || activity?.rubric_document_name || null;
      }
      const { error: guideError } = await supabase.from("activity_grading_guides").upsert(guidePayload);
      if (guideError) {
        const { error: rollbackError } = await supabase.from("activities").update({
          title: activity?.title || title,
          description: activity?.description || "",
          video_url: activity?.video_url || null,
          deadline: activity?.deadline || null,
          accepting_submissions: activity?.accepting_submissions !== false,
        }).eq("id", id);
        if (rollbackError) throw new Error(`Không lưu được ma trận chấm: ${guideError.message}. Đồng thời chưa hoàn tác được thông tin bài học: ${rollbackError.message}`);
        activityUpdated = false;
        throw new Error("Không lưu được ma trận chấm: " + guideError.message);
      }

      if (uploadedRubricPath && oldPath && oldPath !== uploadedRubricPath) {
        const { error: cleanupError } = await supabase.storage.from("learning-resources").remove([oldPath]);
        if (cleanupError) console.warn("Không xóa được file ma trận cũ:", cleanupError.message);
      }
      alert("✅ Đã lưu bài học và ma trận chấm điểm.");
      setExpandedAct(null);
      setEditRubricFile(null);
      setEditRubricFileName("");
      setEditRubricImportError("");
      fetchData();
    } catch (error) {
      if (uploadedRubricPath) await supabase.storage.from("learning-resources").remove([uploadedRubricPath]);
      if (activityUpdated) alert(`Bài học đã cập nhật nhưng ma trận chưa lưu. ${error instanceof Error ? error.message : "Hãy thử lưu lại ma trận."}`);
      else alert(error instanceof Error ? error.message : "Không thể lưu bài học và ma trận.");
    } finally {
      setSavingActivityId(null);
    }
  };
  const deleteActivity = async (id: number) => {
    if (previewMode) {
      setActivities((current) => current.filter((activity) => activity.id !== id));
      setSelectedActsToMerge((current) => current.filter((activityId) => activityId !== id));
      setPreviewNotice(`Đã xóa thử bài ${id} khỏi phiên xem trước.`);
      return;
    }
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
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (previewMode) {
      setActivities((current) => current.map((activity) => activity.id === actId ? { ...activity, document_url: `preview/${file.name}` } : activity));
      setPreviewNotice(`Đã gắn thử “${file.name}” vào bài ${actId}; tệp chưa được tải lên kho thật.`);
      input.value = "";
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert("Tài liệu không được vượt quá 100 MB.");
      input.value = "";
      return;
    }

    const cleanName = file.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 180) || "tai-lieu";
    const fileName = `act-${actId}-${Date.now()}-${cleanName}`;
    const previousPath = activities.find((activity) => activity.id === actId)?.document_url || null;
    let uploaded = false;
    let persisted = false;
    setUploadingDocumentActivityId(actId);
    try {
      const { error: uploadError } = await supabase.storage.from("videos").upload(fileName, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) throw new Error("Tải tệp lên thất bại: " + uploadError.message);
      uploaded = true;

      const { data, error: updateError } = await supabase.from("activities")
        .update({ document_url: fileName }).eq("id", actId).select("id").maybeSingle();
      if (updateError || !data) throw new Error(updateError?.message || "Không tìm thấy bài học để lưu tài liệu.");
      persisted = true;

      let cleanupWarning = "";
      if (previousPath && previousPath !== fileName && !previousPath.startsWith("http")) {
        const { error: removeError } = await supabase.storage.from("videos").remove([previousPath]);
        if (removeError) cleanupWarning = " Tài liệu mới đã lưu, nhưng file cũ chưa được dọn khỏi kho.";
      }
      alert("✅ Đã lưu tài liệu cho bài học!" + cleanupWarning);
      await fetchData();
    } catch (error) {
      if (uploaded && !persisted) {
        const { error: cleanupError } = await supabase.storage.from("videos").remove([fileName]);
        if (cleanupError) console.warn("Không dọn được file tải lên khi lưu thất bại:", cleanupError.message);
      }
      const message = error instanceof Error ? error.message : "Lỗi kết nối cơ sở dữ liệu.";
      alert(persisted ? "Tài liệu đã lưu nhưng không tải lại được danh sách: " + message : "Không lưu được tài liệu: " + message);
    } finally {
      input.value = "";
      setUploadingDocumentActivityId(null);
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

    if (previewMode) {
      setActivities((current) => current
        .filter((activity) => !removeIds.includes(activity.id))
        .map((activity) => activity.id === targetId ? { ...activity, title: mergeTitle.trim(), description: mergedDesc, grading_rubric: mergedRubric || null } : activity));
      setSubmissions((current) => current.map((submission) => removeIds.includes(submission.activity_id) ? { ...submission, activity_id: targetId } : submission));
      setSelectedActsToMerge([]); setShowMergeModal(false); setMergeTitle(""); setMergeDesc("");
      setPreviewNotice(`Đã gộp thử ${selectedActsToMerge.length} bài vào bài ${targetId} trong phiên xem trước.`);
      return;
    }

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
    if (isCreatingAct || isImportingNewActRubric) return;
    if (!newActTitle.trim()) {
      alert("Vui lòng nhập tên bài tập mới!");
      return;
    }
    if (newActRubricFile && !rubricDocumentSchemaReady && !previewMode) {
      alert("Cần áp dụng migration 20261031002700_rubric_document_import.sql trước khi lưu file gốc ma trận.");
      return;
    }
    if (previewMode) {
      const nextId = Math.max(0, ...activities.map((activity) => Number(activity.id) || 0)) + 1;
      setActivities((current) => [...current, {
        id: nextId, title: newActTitle.trim(), description: newActDesc.trim() || "Bài học mới trong bản xem trước.",
        video_url: newActVideo.trim() || null, document_url: newActFile ? `preview/${newActFile.name}` : null,
        deadline: newActDeadline ? new Date(newActDeadline).toISOString() : null, status: "available", phase: newActPhase,
        type: newActType, duration: newActDuration.trim() || "Theo hướng dẫn giáo viên", accepting_submissions: newActAcceptingSubmissions,
        course_id: newActCourseId || null, chapter_id: newActChapterId || null, grading_rubric: newActRubric.trim() || null,
        rubric_document_name: newActRubricFile?.name || null,
      }]);
      setNewActTitle(""); setNewActDesc(""); setNewActVideo(""); setNewActDeadline(""); setNewActRubric(""); setNewActFile(null);
      setNewActRubricFile(null); setNewActRubricFileName(""); setNewActRubricImportError("");
      setNewActCourseId(""); setNewActChapterId(""); setNewActPhase("Trước lớp"); setNewActType("Bài tập"); setNewActDuration(""); setNewActAcceptingSubmissions(true);
      setActiveTab("activities");
      setPreviewNotice(`Đã tạo thử bài ${nextId}. Bài này chỉ tồn tại trong phiên xem trước.`);
      return;
    }
    setIsCreatingAct(true);
    let uploadedDocUrl = "";
    let uploadedRubricPath = "";
    let createdActivityId: number | null = null;
    try {
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
        phase: newActPhase,
        type: newActType,
        duration: newActDuration.trim() || null,
        accepting_submissions: newActAcceptingSubmissions,
        course_id: newActCourseId || null,
        chapter_id: newActChapterId || null,
      }).select('id').single();
      if (error || !createdActivity) throw new Error(error?.message || "Không tạo được bài học.");
      createdActivityId = createdActivity.id;

      if (newActRubricFile) {
        const safeName = newActRubricFile.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 150) || "rubric";
        uploadedRubricPath = `rubrics/activity-${createdActivity.id}/${Date.now()}-${safeName}`;
        const { error: rubricUploadError } = await supabase.storage.from("learning-resources").upload(uploadedRubricPath, newActRubricFile, { contentType: rubricUploadMimeType(newActRubricFile), upsert: false });
        if (rubricUploadError) throw new Error("Không tải được file ma trận: " + rubricUploadError.message);
      }

      const guidePayload: Record<string, string | number | null> = {
        activity_id: createdActivity.id,
        grading_rubric: newActRubric.trim() || null,
      };
      if (rubricDocumentSchemaReady) {
        guidePayload.rubric_document_path = uploadedRubricPath || null;
        guidePayload.rubric_document_name = newActRubricFile?.name || null;
      }
      const { error: guideError } = await supabase.from('activity_grading_guides').upsert(guidePayload);
      if (guideError) throw new Error("Không lưu được ma trận chấm: " + guideError.message);

      alert(`✅ Đã tạo thành công Bài tập số ${createdActivity.id}!`);
      setNewActTitle("");
      setNewActDesc("");
      setNewActVideo("");
      setNewActDeadline("");
      setNewActRubric("");
      setNewActRubricFile(null);
      setNewActRubricFileName("");
      setNewActRubricImportError("");
      setNewActFile(null);
      setNewActCourseId("");
      setNewActChapterId("");
      setNewActPhase("Trước lớp");
      setNewActType("Bài tập");
      setNewActDuration("");
      setNewActAcceptingSubmissions(true);
      setActiveTab("activities");
      fetchData();
    } catch (err: unknown) {
      if (createdActivityId !== null) await supabase.from("activities").delete().eq("id", createdActivityId);
      if (uploadedRubricPath) await supabase.storage.from("learning-resources").remove([uploadedRubricPath]);
      if (uploadedDocUrl) await supabase.storage.from("videos").remove([uploadedDocUrl]);
      alert("Không tạo được bài học: " + (err instanceof Error ? err.message : "Lỗi kết nối cơ sở dữ liệu."));
    } finally {
      setIsCreatingAct(false);
    }
  };
  // --- QUẢN LÝ BÀI TẬP NHÓM ---
  const createGroupAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newGroupTitle.trim();
    if (!title) return alert("Nhập tên bài tập nhóm trước khi lưu.");
    if (newGroupClassName === "__choose__") return alert("Hãy chọn lớp nhận bài nhóm hoặc chọn tất cả lớp.");
    const className = newGroupClassName === "__all__" ? null : newGroupClassName.trim();
    const targetStudents = className ? filterStudentRoster(activeStudents, className, "") : activeStudents;
    if (!Number.isInteger(numGroups) || numGroups < 1 || numGroups > 50 || !Number.isInteger(maxStudentsPerGroup) || maxStudentsPerGroup < 1 || maxStudentsPerGroup > 100) {
      return alert("Số nhóm phải từ 1–50 và sĩ số tối đa mỗi nhóm phải từ 1–100.");
    }
    if (!targetStudents.length) return alert(className ? `Lớp ${className} chưa có hồ sơ học sinh.` : "Hãy nhập danh sách học sinh trước khi chia nhóm.");
    if (targetStudents.length > numGroups * maxStudentsPerGroup) return alert(`Sức chứa hiện tại là ${numGroups * maxStudentsPerGroup} học sinh, chưa đủ cho lớp có ${targetStudents.length} em. Hãy tăng số nhóm hoặc sĩ số tối đa.`);

    let deadline: string | null = null;
    try { deadline = newGroupDeadline ? new Date(newGroupDeadline).toISOString() : null; }
    catch { return alert("Thời hạn chưa hợp lệ."); }

    if (previewMode) {
      const assignmentId = `preview-group-${++previewGroupSequence.current}`;
      const groups = Array.from({ length: numGroups }, (_, index) => ({
        id: `${assignmentId}-${index + 1}`, assignment_id: assignmentId, group_number: index + 1,
        group_name: `Nhóm ${index + 1}`,
        group_assignment_members: [] as any[],
      }));
      targetStudents.forEach((student: any, index: number) => {
        const group = groups[index % groups.length];
        group.group_assignment_members.push({ id: `${group.id}-${student.id}`, group_id: group.id, student_id: student.id, students: student });
      });
      const assignment = { id: assignmentId, title, description: newGroupDesc.trim(), deadline, document_url: newGroupDocUrl.trim() || null, rubric: newGroupRubric.trim(), class_name: className, group_assignment_groups: groups };
      setGroupAssignments((current) => [assignment, ...current]);
      setCurrentGroupMembers(groups); setExpandedGroupAct(assignmentId); setGroupRubricText(newGroupRubric.trim());
      setNewGroupTitle(""); setNewGroupDesc(""); setNewGroupDeadline(""); setNewGroupDocUrl(""); setNewGroupRubric("");
      setPreviewNotice(`Đã tạo thử “${title}” và phân ${targetStudents.length} học sinh vào ${numGroups} nhóm.`);
      return;
    }

    const { data: assignmentId, error } = await supabase.rpc("create_group_assignment_for_class", {
      p_title: title,
      p_description: newGroupDesc.trim(),
      p_deadline: deadline,
      p_document_url: newGroupDocUrl.trim() || null,
      p_rubric: newGroupRubric.trim(),
      p_class_name: className,
      p_group_count: numGroups,
      p_max_students: maxStudentsPerGroup,
    });
    if (error || !assignmentId) {
      const detail = error?.code === "PGRST202" ? "Cần áp dụng migration 20261101000200_group_assignment_classes.sql trên Supabase." : error?.message || "Máy chủ chưa trả mã bài tập.";
      alert("Không tạo được bài tập nhóm. Không có dữ liệu dở dang được lưu. " + detail);
      return;
    }

    setNewGroupTitle("");
    setNewGroupDesc("");
    setNewGroupDeadline("");
    setNewGroupDocUrl("");
    setNewGroupRubric("");
    alert(`Đã tạo bài tập nhóm cho ${className || "tất cả lớp"} và chia ${targetStudents.length} học sinh thành ${numGroups} nhóm.`);
    await fetchData();
  };

  const deleteGroupAssignment = async (id: string) => {
    if (previewMode) {
      setGroupAssignments((current) => current.filter((assignment) => assignment.id !== id));
      setGroupSubmissions((current) => current.filter((submission) => submission.assignment_id !== id));
      if (expandedGroupAct === id) { setExpandedGroupAct(null); setCurrentGroupMembers([]); }
      setPreviewNotice("Đã xóa thử bài tập nhóm khỏi phiên xem trước.");
      return;
    }
    if (!confirm("Xóa bài tập nhóm này và toàn bộ danh sách nhóm/bài nộp?")) return;
    const { error } = await supabase.from("group_assignments").delete().eq("id", id);
    if (error) return alert("Không xóa được bài tập nhóm: " + error.message);
    const rubricPath = groupAssignments.find((assignment) => assignment.id === id)?.rubric_document_path;
    if (rubricPath) {
      const { error: fileError } = await supabase.storage.from("class-work").remove([rubricPath]);
      if (fileError) alert("Bài nhóm đã xóa, nhưng file ma trận chưa được dọn: " + fileError.message);
    }
    if (expandedGroupAct === id) {
      setExpandedGroupAct(null);
      setCurrentGroupMembers([]);
    }
    await fetchData();
  };

  const fetchGroupDetails = async (assignId: string) => {
    const requestId = ++groupDetailsRequestRef.current;
    setLoadingGroupDetailsId(assignId);
    setGroupDetailsError("");
    setGroupRubricAssignmentId(assignId);
    setGroupRubricText("");
    setGroupRubricFile(null);
    setGroupRubricFileName("");
    setGroupRubricImportError("");
    setGroupRubricDocumentSchemaReady(false);
    setCurrentGroupMembers([]);
    try {
      if (previewMode) {
        const assignment = groupAssignments.find((item) => item.id === assignId);
        setCurrentGroupMembers(assignment?.group_assignment_groups || []);
        setGroupRubricText(assignment?.rubric || "");
        setGroupRubricFileName(assignment?.rubric_document_name || "");
        return;
      }
      const [groupsResult, rubricResult] = await Promise.all([
        supabase.from('group_assignment_groups').select('*, group_assignment_members(*, students(*))').eq('assignment_id', assignId).order('group_number'),
        supabase.from('group_assignments').select('id,rubric,rubric_document_path,rubric_document_name').eq('id', assignId).maybeSingle(),
      ]);
      if (requestId !== groupDetailsRequestRef.current) return;
      if (groupsResult.error) throw new Error(groupsResult.error.message);
      setCurrentGroupMembers(groupsResult.data || []);

      let rubricData = rubricResult.data as any;
      let documentSchemaReady = !rubricResult.error;
      if (rubricResult.error?.code === "42703" || rubricResult.error?.code === "PGRST204") {
        const legacyResult = await supabase.from('group_assignments').select('id,rubric').eq('id', assignId).maybeSingle();
        if (requestId !== groupDetailsRequestRef.current) return;
        rubricData = legacyResult.data;
        documentSchemaReady = false;
        if (legacyResult.error) alert("Không tải được ma trận điểm nhóm: " + legacyResult.error.message);
      } else if (rubricResult.error) {
        alert("Không tải được ma trận điểm nhóm: " + rubricResult.error.message);
      }
      setGroupRubricDocumentSchemaReady(documentSchemaReady);
      setGroupRubricText(rubricData?.rubric || "");
      setGroupRubricFileName(rubricData?.rubric_document_name || "");
    } catch (error) {
      if (requestId === groupDetailsRequestRef.current) {
        setCurrentGroupMembers([]);
        setGroupDetailsError(error instanceof Error ? error.message : "Không tải được danh sách nhóm.");
      }
    } finally {
      if (requestId === groupDetailsRequestRef.current) setLoadingGroupDetailsId(null);
    }
  };

  const beginRenameGroup = (group: any) => {
    setRenamingGroupId(group.id);
    setGroupNameDraft(group.group_name || `Nhóm ${group.group_number}`);
  };

  const renameGroup = async (group: any) => {
    const nextName = groupNameDraft.trim();
    if (!nextName) return alert("Tên nhóm không được để trống.");
    if (nextName.length > 60) return alert("Tên nhóm tối đa 60 ký tự.");
    const duplicate = currentGroupMembers.some((item) => item.id !== group.id && String(item.group_name || "").trim().toLocaleLowerCase("vi") === nextName.toLocaleLowerCase("vi"));
    if (duplicate) return alert("Tên này đã được một nhóm khác trong bài tập sử dụng.");
    if (previewMode) {
      const updateGroup = (item: any) => item.id === group.id ? { ...item, group_name: nextName } : item;
      setCurrentGroupMembers((current) => current.map(updateGroup));
      setGroupAssignments((current) => current.map((assignment) => assignment.id === group.assignment_id ? { ...assignment, group_assignment_groups: (assignment.group_assignment_groups || []).map(updateGroup) } : assignment));
      setGroupSubmissions((current) => renameGroupInSubmissions(current, group.id, nextName));
      setRenamingGroupId(null); setGroupNameDraft("");
      setPreviewNotice(`Đã đổi thử tên nhóm thành “${nextName}”.`);
      return;
    }
    const { data, error } = await supabase.from("group_assignment_groups").update({ group_name: nextName }).eq("id", group.id).select("id").single();
    if (error || !data) return alert("Không đổi được tên nhóm: " + (error?.code === "23505" ? "Tên này đã được sử dụng trong bài tập." : error?.message || "Không tìm thấy nhóm."));
    setGroupSubmissions((current) => renameGroupInSubmissions(current, group.id, nextName));
    setRenamingGroupId(null);
    setGroupNameDraft("");
    await fetchGroupDetails(group.assignment_id);
  };

  const toggleExpandGroupAct = (id: string) => {
    if (isImportingGroupRubric || savingGroupRubricId !== null) return;
    if (expandedGroupAct === id) {
      groupDetailsRequestRef.current += 1;
      setLoadingGroupDetailsId(null);
      setExpandedGroupAct(null);
      setCurrentGroupMembers([]);
      setGroupDetailsError("");
    } else {
      setExpandedGroupAct(id);
      fetchGroupDetails(id);
    }
  };

  const createGroupsForAssignment = async (assignId: string, isRandom: boolean) => {
    if (regroupingAssignmentId) return;
    const assignment = groupAssignments.find((item) => item.id === assignId);
    const className = assignment?.class_name || "";
    const targetStudents = className ? filterStudentRoster(activeStudents, className, "") : activeStudents;
    if (!targetStudents.length) return alert(className ? `Lớp ${className} chưa có hồ sơ học sinh.` : "Hãy nhập danh sách học sinh trước khi chia nhóm.");
    if (targetStudents.length > numGroups * maxStudentsPerGroup) return alert(`Sức chứa hiện tại là ${numGroups * maxStudentsPerGroup} học sinh, chưa đủ cho lớp có ${targetStudents.length} em.`);
    const submittedCount = groupSubmissions.filter((submission) => submission.assignment_id === assignId).length;
    if (submittedCount > 0) return alert("Bài nhóm đã có bài nộp nên không thể đổi thành viên. Hãy tạo bài nhóm mới nếu cần chia lại để giữ đúng lịch sử và quyền xem bài.");
    if (!confirm(`Phân ${targetStudents.length} học sinh${className ? ` của lớp ${className}` : " của tất cả lớp"} vào ${numGroups} nhóm${isRandom ? " ngẫu nhiên" : " theo danh sách"}?`)) return;

    if (previewMode) {
      const ordered = isRandom ? [...targetStudents].sort(() => Math.random() - 0.5) : [...targetStudents];
      const groups = Array.from({ length: numGroups }, (_, index) => ({ id: `${assignId}-${index + 1}`, assignment_id: assignId, group_number: index + 1, group_name: `Nhóm ${index + 1}`, group_assignment_members: [] as any[] }));
      ordered.forEach((student, index) => groups[index % groups.length].group_assignment_members.push({ id: `${groups[index % groups.length].id}-${student.id}`, group_id: groups[index % groups.length].id, student_id: student.id, students: student }));
      setCurrentGroupMembers(groups);
      setGroupAssignments((current) => current.map((assignment) => assignment.id === assignId ? { ...assignment, group_assignment_groups: groups } : assignment));
      setPreviewNotice(`Đã chia lại thử ${targetStudents.length} học sinh vào ${numGroups} nhóm${isRandom ? " ngẫu nhiên" : " theo danh sách"}.`);
      return;
    }

    setRegroupingAssignmentId(assignId);
    try {
      const { data, error } = await supabase.rpc("regroup_assignment_students", {
        p_assignment_id: assignId,
        p_group_count: numGroups,
        p_max_students: maxStudentsPerGroup,
        p_random: isRandom,
      });
      if (error) throw error;
      if (typeof data !== "number" || data !== targetStudents.length) throw new Error("Máy chủ chưa xác nhận đủ số học sinh được chia nhóm.");
      await Promise.all([fetchGroupDetails(assignId), fetchData()]);
      alert(`Đã chia ${data} học sinh lớp ${className || "tất cả lớp"} thành ${numGroups} nhóm.`);
    } catch (error) {
      alert("Không chia lại được nhóm; dữ liệu cũ vẫn được giữ. " + (error instanceof Error ? error.message : "Lỗi cơ sở dữ liệu."));
    } finally {
      setRegroupingAssignmentId(null);
    }
  };

  const saveGroupRubric = async (assignId: string) => {
    if (savingGroupRubricId || loadingGroupDetailsId === assignId || groupRubricAssignmentId !== assignId) return;
    if (groupRubricText.length > 20000) return alert("Ma trận điểm tối đa 20.000 ký tự.");
    if (groupRubricFile && !groupRubricDocumentSchemaReady) {
      return alert("Chưa thể lưu file gốc vì thiếu migration 20261101000100_group_rubric_documents.sql. Nội dung đã trích vẫn có thể lưu; áp dụng migration rồi tải lại trước khi lưu file.");
    }
    if (previewMode) {
      setGroupAssignments((current) => current.map((assignment) => assignment.id === assignId ? { ...assignment, rubric: groupRubricText } : assignment));
      setPreviewNotice("Đã lưu thử ma trận điểm của bài nhóm.");
      return;
    }
    setSavingGroupRubricId(assignId);
    let uploadedPath: string | null = null;
    const assignment = groupAssignments.find((item) => item.id === assignId);
    const oldPath = assignment?.rubric_document_path || null;
    try {
      if (groupRubricFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập hết hạn. Hãy đăng nhập lại.");
        const safeName = groupRubricFile.name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "rubric";
        uploadedPath = `group-rubrics/${user.id}/${assignId}-${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("class-work").upload(uploadedPath, groupRubricFile, {
          contentType: rubricUploadMimeType(groupRubricFile), upsert: false,
        });
        if (uploadError) throw new Error("Không tải được file ma trận: " + uploadError.message);
      }
      const rubricDocumentPath = uploadedPath || oldPath;
      const rubricDocumentName = groupRubricFile?.name || assignment?.rubric_document_name || null;
      const updatePayload: Record<string, string | null> = { rubric: groupRubricText.trim() };
      if (groupRubricDocumentSchemaReady) {
        updatePayload.rubric_document_path = rubricDocumentPath;
        updatePayload.rubric_document_name = rubricDocumentName;
      }
      const { data, error } = await supabase.from("group_assignments")
        .update(updatePayload).eq("id", assignId).select("id").maybeSingle();
      if (error || !data) throw new Error(error?.message || "Không tìm thấy bài tập nhóm.");
      if (uploadedPath && oldPath && oldPath !== uploadedPath) {
        const { error: removeError } = await supabase.storage.from("class-work").remove([oldPath]);
        if (removeError) console.warn("Không xóa được file ma trận nhóm cũ:", removeError.message);
      }
      setGroupAssignments((current) => current.map((item) => item.id === assignId ? {
        ...item, rubric: groupRubricText.trim(), rubric_document_path: rubricDocumentPath, rubric_document_name: rubricDocumentName,
      } : item));
      setGroupRubricFile(null);
      setGroupRubricFileName(rubricDocumentName || "");
      alert("Đã lưu ma trận và file gốc cho bài nhóm.");
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("class-work").remove([uploadedPath]);
      alert("Không lưu được ma trận điểm: " + (error instanceof Error ? error.message : "Lỗi cơ sở dữ liệu."));
    } finally {
      setSavingGroupRubricId(null);
    }
  };

  const handleNewActivityRubricFile = async (file: File) => {
    setNewActRubricFile(file);
    setNewActRubricFileName(file.name);
    setNewActRubricImportError("");
    setIsImportingNewActRubric(true);
    try {
      const extracted = await readRubricFile(file);
      setNewActRubric(extracted.text);
      setNewActRubricImportError(extracted.warning);
    } catch (error) {
      setNewActRubricFile(null);
      setNewActRubricFileName("");
      setNewActRubricImportError(error instanceof Error ? error.message : "Không đọc được file ma trận.");
    } finally {
      setIsImportingNewActRubric(false);
    }
  };

  const handleEditActivityRubricFile = async (file: File) => {
    setEditRubricFile(file);
    setEditRubricFileName(file.name);
    setEditRubricImportError("");
    setIsImportingEditRubric(true);
    try {
      const extracted = await readRubricFile(file);
      setEditRubricText(extracted.text);
      setEditRubricImportError(extracted.warning);
    } catch (error) {
      setEditRubricFile(null);
      setEditRubricFileName("");
      setEditRubricImportError(error instanceof Error ? error.message : "Không đọc được file ma trận.");
    } finally {
      setIsImportingEditRubric(false);
    }
  };

  const handleGroupRubricFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, assignId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (loadingGroupDetailsId || groupRubricAssignmentId !== assignId) return;
    setGroupRubricFileName(file.name);
    setGroupRubricFile(file);
    setGroupRubricImportError("");
    setIsImportingGroupRubric(true);
    try {
      const extracted = await readRubricFile(file);
      setGroupRubricText(extracted.text);
      setGroupRubricImportError(extracted.warning);
    } catch (error) {
      setGroupRubricFile(null);
      setGroupRubricFileName("");
      setGroupRubricImportError(error instanceof Error ? error.message : "Không đọc được file ma trận.");
    } finally {
      setIsImportingGroupRubric(false);
      event.target.value = "";
    }
  };

  const downloadGroupRubricDocument = async (assignment: any) => {
    if (!assignment?.rubric_document_path) return;
    const { data, error } = await supabase.storage.from("class-work").download(assignment.rubric_document_path);
    if (error || !data) return alert("Không tải được file ma trận: " + (error?.message || "File không tồn tại."));
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = assignment.rubric_document_name || "ma-tran-nhom";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const gradeGroupWithAI = async (subId: string, answer: string) => {
    if (previewMode) {
      setGroupSubmissions((current) => current.map((submission) => submission.id === subId ? { ...submission, ai_score: 8, ai_feedback: "Kết quả AI mô phỏng: lập luận rõ; bổ sung đơn vị và kiểm tra giả thiết mô hình.", ai_strengths: "Có quy trình và kết quả.", ai_weaknesses: "Cần diễn giải số liệu kỹ hơn.", status: "graded" } : submission));
      setPreviewNotice("Đã chấm thử bài nhóm bằng phản hồi AI mô phỏng.");
      return;
    }
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
    if (!selectedGradingAct || isSavingRubric || isImportingRubric) return;
    if (previewMode) {
      setActivities((current) => current.map((activity) => activity.id === selectedGradingAct.id ? { ...activity, grading_rubric: rubricText || null, rubric_document_name: rubricFile?.name || activity.rubric_document_name || null } : activity));
      setSelectedGradingAct((current: any) => current ? { ...current, grading_rubric: rubricText || null, rubric_document_name: rubricFile?.name || current.rubric_document_name || null } : current);
      setPreviewNotice("Đã lưu thử rubric và tệp nguồn trong phiên xem trước.");
      return;
    }
    if (rubricFile && !rubricDocumentSchemaReady) {
      alert("Chưa thể lưu tệp gốc vì migration 20261031002700_rubric_document_import.sql chưa được áp dụng. Nội dung ma trận chưa bị mất; hãy áp dụng migration rồi bấm Lưu ma trận lại.");
      return;
    }
    setIsSavingRubric(true);
    const oldPath = selectedGradingAct.rubric_document_path || null;
    let uploadedPath: string | null = oldPath;
    let newUploadedPath: string | null = null;
    try {
      if (rubricFile) {
        const safeName = rubricFile.name.normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 150) || "rubric";
        newUploadedPath = `rubrics/activity-${selectedGradingAct.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("learning-resources").upload(newUploadedPath, rubricFile, { contentType: rubricUploadMimeType(rubricFile), upsert: false });
        if (uploadError) throw new Error("Không tải được tệp ma trận: " + uploadError.message);
        uploadedPath = newUploadedPath;
      }
      const guidePayload: GradingGuide = {
        activity_id: selectedGradingAct.id,
        model_answer: selectedGradingAct.model_answer || null,
        grading_rubric: rubricText.trim() || null,
      };
      if (rubricDocumentSchemaReady) {
        guidePayload.rubric_document_path = uploadedPath;
        guidePayload.rubric_document_name = rubricFile?.name || selectedGradingAct.rubric_document_name || null;
      }
      const { error } = await supabase.from("activity_grading_guides").upsert(guidePayload);
      if (error) throw new Error("Không lưu được ma trận điểm: " + error.message);

      if (newUploadedPath && oldPath && oldPath !== newUploadedPath) {
        const { error: removeError } = await supabase.storage.from("learning-resources").remove([oldPath]);
        if (removeError) console.warn("Không dọn được file ma trận cũ:", removeError.message);
      }
      const savedActivity = {
        ...selectedGradingAct,
        grading_rubric: rubricText.trim() || null,
        rubric_document_path: uploadedPath,
        rubric_document_name: rubricFile?.name || selectedGradingAct.rubric_document_name || null,
      };
      setActivities((current) => current.map((activity) => activity.id === savedActivity.id ? savedActivity : activity));
      setSelectedGradingAct(savedActivity);
      setRubricFile(null);
      setRubricFileName("");
      setRubricImportError("");
      alert("✅ Đã lưu ma trận và file gốc cho bài " + selectedGradingAct.id);
      fetchData();
    } catch (error) {
      if (newUploadedPath) await supabase.storage.from("learning-resources").remove([newUploadedPath]);
      alert(error instanceof Error ? error.message : "Không lưu được ma trận chấm điểm.");
    } finally {
      setIsSavingRubric(false);
    }
  };
  const handleRubricFileUpload = async (file: File | null) => {
    if (!file) return;
    setRubricFileName(file.name);
    setRubricFile(file);
    setRubricImportError("");
    setIsImportingRubric(true);
    try {
      const extracted = await readRubricFile(file);
      setRubricText(extracted.text);
      setRubricImportError(extracted.warning);
    } catch (error) {
      setRubricFile(null);
      setRubricFileName("");
      setRubricImportError(error instanceof Error ? error.message : "Không đọc được tệp ma trận này.");
    } finally {
      setIsImportingRubric(false);
    }
  };

  const downloadRubricDocument = async (activity: any = selectedGradingAct) => {
    const path = activity?.rubric_document_path;
    if (!path) return;
    const { data, error } = await supabase.storage.from("learning-resources").download(path);
    if (error || !data) { alert("Không tải được tệp ma trận: " + (error?.message || "tệp không tồn tại")); return; }
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activity.rubric_document_name || "ma-tran-cham-diem";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const gradeWithAI = async (id: string, answer: string) => {
    setGradingId(id);
    if (previewMode) {
      window.setTimeout(() => {
        const answerSize = answer.trim().length;
        const score = Math.min(9.5, Math.max(5, Math.round((6.5 + Math.min(answerSize, 1000) / 350) * 10) / 10));
        setSubmissions((current) => current.map((submission) => submission.id === id ? {
          ...submission,
          ai_score: score,
          ai_feedback: "Gợi ý chấm mô phỏng: bài có ý chính, hãy bổ sung phép tính, đơn vị SI và kết luận vật lí.",
          ai_strengths: "Có trình bày nội dung trả lời.",
          ai_weaknesses: "Cần kiểm tra công thức và đơn vị.",
          status: "graded",
        } : submission));
        setPreviewNotice("AI đã chấm mô phỏng bài mẫu. Bản xem trước không gửi bài hay tiêu thụ quota Gemini.");
        setGradingId(null);
      }, 350);
      return;
    }
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

  const saveTeacherGrade = async (submissionId: string, scoreInputId: string, feedbackInputId: string) => {
    const scoreElement = document.getElementById(scoreInputId) as HTMLInputElement | null;
    const feedbackElement = document.getElementById(feedbackInputId) as HTMLInputElement | null;
    const score = Number(scoreElement?.value);
    if (!Number.isFinite(score) || score < 0 || score > 10) { alert("Điểm giáo viên phải nằm trong khoảng từ 0 đến 10."); return; }
    const teacher_feedback = feedbackElement?.value.trim() || null;
    if (previewMode) {
      setSubmissions((current) => current.map((submission) => submission.id === submissionId ? { ...submission, final_score: score, teacher_feedback, status: "graded" } : submission));
      setPreviewNotice("Đã lưu điểm giáo viên vào bài nộp mẫu; điểm AI vẫn được giữ riêng để đối chiếu.");
      return;
    }
    const { error } = await supabase.from("submissions").update({ final_score: score, teacher_feedback, status: "graded" }).eq("id", submissionId);
    if (error) { alert("Không lưu được điểm giáo viên: " + error.message); return; }
    await fetchData();
  };

  const saveTeacherGroupGrade = async (submissionId: string, scoreInputId: string, feedbackInputId: string) => {
    const scoreElement = document.getElementById(scoreInputId) as HTMLInputElement | null;
    const feedbackElement = document.getElementById(feedbackInputId) as HTMLInputElement | null;
    const score = Number(scoreElement?.value);
    if (!Number.isFinite(score) || score < 0 || score > 10) { alert("Điểm giáo viên phải nằm trong khoảng từ 0 đến 10."); return; }
    const teacher_feedback = feedbackElement?.value.trim() || null;
    if (previewMode) {
      setGroupSubmissions((current) => current.map((submission) => submission.id === submissionId ? { ...submission, final_score: score, teacher_feedback, status: "graded" } : submission));
      setPreviewNotice("Đã lưu điểm giáo viên vào bài nhóm mẫu; gợi ý AI được giữ riêng.");
      return;
    }
    const { error } = await supabase.from("group_submissions").update({ final_score: score, teacher_feedback, status: "graded" }).eq("id", submissionId);
    if (error) { alert("Không lưu được điểm giáo viên cho nhóm: " + error.message); return; }
    await fetchData();
  };

  // --- CHẤM ẢNH OCR & LƯU VÀO DATABASE ---
  const handleOcrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewMode) {
      setOcrText(`[Bản trích xuất mô phỏng từ tệp “${file.name}”]\nNhập hoặc chỉnh sửa nội dung bài làm tại đây để thử chấm AI.`);
      setPreviewNotice("Tệp ảnh chỉ được đọc cục bộ trong bản xem trước; chưa gửi lên AI hoặc kho dữ liệu.");
      e.target.value = "";
      return;
    }
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
    } catch (err: unknown) {
      alert("Không xử lý được ảnh OCR: " + (err instanceof Error ? err.message : "Lỗi kết nối cơ sở dữ liệu."));
      setIsOcrProcessing(false);
    }
  };

  const executeOcrGrading = async () => {
    if (!ocrText.trim()) {
      alert("Chưa có nội dung văn bản để chấm điểm.");
      return;
    }
    if (previewMode) {
      setOcrResult({ score: 7.5, feedback: "Kết quả mô phỏng: bài có hướng giải hợp lí. Cần kiểm tra đơn vị và nêu rõ kết luận vật lí.", strengths: "Có sử dụng công thức và nêu các bước xử lí.", weaknesses: "Bổ sung đơn vị, điều kiện áp dụng và làm tròn kết quả.", model_answer: "Đây là phản hồi mẫu trong chế độ xem trước." });
      setPreviewNotice("Đã tạo kết quả OCR/AI mô phỏng; không gửi ảnh hoặc dữ liệu ra ngoài.");
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
    if (previewMode) {
      setSubmissions((current) => [...current, { id: `preview-ocr-${Date.now()}`, student_name: ocrStudentName.trim(), activity_id: ocrActivityId, answer: `[Bài OCR mô phỏng]:\n${ocrText}`, ai_score: ocrResult.score, ai_feedback: ocrResult.feedback, ai_strengths: ocrResult.strengths, ai_weaknesses: ocrResult.weaknesses, status: "pending", submitted_at: new Date().toISOString() }]);
      setOcrText(""); setOcrResult(null); setPreviewNotice("Đã lưu bài OCR vào danh sách mẫu để cô tiếp tục thử luồng chấm.");
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
    if (previewMode) {
      const examples = [
        { question: `Khi tăng điện áp đặt vào một tụ có điện dung không đổi, đại lượng nào tăng tỉ lệ thuận? (${aiQuizTopic})`, image_url: "", options: ["Điện tích Q", "Điện dung C", "Khoảng cách d", "Hằng số điện môi"], correct_option: 0, explanation: "Q = CU khi C không đổi." },
        { question: "Đơn vị SI của điện dung là gì?", image_url: "", options: ["Fara (F)", "Vôn (V)", "Culông (C)", "Jun (J)"], correct_option: 0, explanation: "Điện dung có đơn vị fara." },
      ].slice(0, Math.max(1, Math.min(aiQuizCount, 2)));
      setNewQs(examples); setPreviewNotice("Đã tạo bộ câu hỏi mẫu tại chỗ để cô chỉnh sửa trước khi lưu.");
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
    if (previewMode) {
      const pending = submissions.filter((submission) => submission.status !== "graded").length;
      setAnalyticsReport({ summary: `Lớp có ${submissions.length} bài nộp mẫu, trong đó ${pending} bài đang chờ giáo viên duyệt.`, topWeaknesses: ["Ghi đơn vị của đại lượng điện", "Phân biệt điện tích Q và điện dung C", "Diễn giải kết quả thí nghiệm từ số liệu"], flippedClassroomAdvice: "Dành 5 phút đầu giờ cho câu hỏi dự đoán Q–U, sau đó ghép cặp để đối chiếu kết quả phòng thí nghiệm ảo.", remedialAction: "Giao lại một phiếu ngắn về đổi đơn vị và dùng phản hồi từng bước thay vì chỉ thông báo đáp án." });
      setPreviewNotice("Đã tạo báo cáo phân tích mẫu từ dữ liệu xem trước.");
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
    if (isAddingStudent) return;
    // Mục 3: chặn chữ số và ký tự đặc biệt trong họ tên.
    if (containsDigit(newStudentName)) { alert("Họ tên học sinh không được chứa chữ số."); return; }
    if (hasInvalidNameCharacters(newStudentName.trim())) { alert("Họ tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy đơn, dấu chấm hoặc gạch nối."); return; }
    const formattedName = formatVietnameseName(newStudentName);
    const className = studentClassName.normalize("NFC").trim();
    if (!className || className.length > 40) { alert("Tên lớp cần dài từ 1 đến 40 ký tự."); return; }
    if (formattedName.length < 3 || formattedName.length > 120) { alert("Họ tên học sinh cần dài từ 3 đến 120 ký tự."); return; }
    const exists = hasStudentInClass(students, formattedName, className);
    if (exists && !confirm(`Lớp ${className} đã có hồ sơ tên "${formattedName}". Nếu đây là hai học sinh khác nhau, tiếp tục?`)) return;

    if (previewMode) {
      const student = { id: `preview-student-${Date.now()}`, full_name: formattedName, class_name: className };
      setStudents((current) => [...current, student].sort(sortVietnameseNames));
      setNewStudentName(""); setNewStudentBirthDate(""); setPreviewNotice(`Đã thêm ${formattedName} vào danh sách mẫu.`);
      return;
    }

    setIsAddingStudent(true);
    try {
      const response = await fetch("/api/teacher/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: formattedName, class_name: className, birth_date: newStudentBirthDate || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tạo được học sinh.");
      setStudents((current) => [...current.filter((student) => student.id !== result.student.id), result.student].sort(sortVietnameseNames));
      setAccountStudent({ full_name: formattedName });
      setStudentAccountCredentials([{ username: result.credentials.username, password: result.credentials.password, studentName: formattedName }]);
      setStudentAccountNotice("Tài khoản đã được tạo. Mật khẩu chỉ hiển thị một lần; hãy sao chép hoặc in phiếu cho học sinh.");
      setStudentAccountError("");
      setNewStudentName(""); setNewStudentBirthDate("");
    } catch (error: unknown) {
      alert("Không tạo được học sinh và tài khoản: " + (error instanceof Error ? error.message : "Lỗi kết nối máy chủ."));
    } finally { setIsAddingStudent(false); }
  };
  // Hàm trích xuất và chuẩn hóa danh sách tên từ mảng chuỗi
  const processAndSortNames = (rawList: string[]): string[] => {
    const rows = processAndSortNameRows(rawList.map((fullName) => ({ fullName, studentCode: "" })));
    setImportPreviewCodes(rows.map((row) => row.studentCode));
    return rows.map((row) => row.fullName);
  };

  // Chuẩn hóa danh sách {fullName, studentCode}: làm sạch, loại tên rác/trùng, sắp xếp A-Z theo tên.
  const processAndSortNameRows = (rawRows: Array<{ fullName: string; studentCode: string }>): Array<{ fullName: string; studentCode: string }> => {
    const valid: Array<{ fullName: string; studentCode: string }> = [];
    const seen = new Set<string>();

    rawRows.forEach((row) => {
      const raw = row.fullName;
      if (!raw || typeof raw !== "string") return;
      const clean = raw.trim();
      if (clean.length < 3) return;
      if (isHeaderOrInvalidCell(clean)) return;

      const formatted = formatVietnameseName(clean);
      if (formatted.length > 120) return;
      // Mục 3: bỏ các tên còn chứa chữ số hoặc ký tự đặc biệt.
      if (containsDigit(formatted) || hasInvalidNameCharacters(formatted)) return;
      const words = formatted.split(/\s+/);
      if (words.length >= 2 && !seen.has(formatted.toLowerCase())) {
        seen.add(formatted.toLowerCase());
        valid.push({ fullName: formatted, studentCode: (row.studentCode || "").trim().slice(0, 40) });
      }
    });

    // Sắp xếp theo TÊN (First Name) theo bảng chữ cái tiếng Việt
    return valid.sort((a, b) => sortVietnameseNames(a.fullName, b.fullName));
  };

  // Xử lý tệp Excel / TXT / CSV thông minh
  const handleSmartFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["xlsx", "csv", "txt"].includes(extension)) { alert("Chỉ hỗ trợ tệp .xlsx, .csv hoặc .txt."); e.target.value = ""; return; }
    if (file.size > 10 * 1024 * 1024) { alert("Tệp danh sách không được vượt quá 10 MB."); e.target.value = ""; return; }
    const isExcel = extension === "xlsx";
    if (isExcel) {
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("Tệp Excel vượt quá 10 MB.");
        const excelBuffer = await file.arrayBuffer();
        await loadBoundedZip(excelBuffer, "Excel");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(excelBuffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error("Tệp không có trang tính nào.");
        if (sheet.rowCount > 2_000) throw new Error("Tệp Excel danh sách chỉ nhận tối đa 2.000 dòng. Hãy chia danh sách thành nhiều lượt.");
        // Mục 4: đọc theo cột để nhận cả họ tên và mã số sinh viên (nếu có).
        const rowsArray: string[][] = [];
        let processedCells = 0;
        sheet.eachRow((row) => {
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            processedCells += 1;
            if (processedCells > 20_000) throw new Error("Tệp Excel danh sách chỉ nhận tối đa 20.000 ô có dữ liệu. Hãy chia danh sách thành nhiều lượt.");
            cells.push(cell.text.trim());
          });
          if (cells.some((value) => value)) rowsArray.push(cells);
        });
        // Chuyển bảng Excel thành văn bản phân cách TAB để dùng chung bộ trích xuất.
        const tabText = rowsArray.map((cells) => cells.join("\t")).join("\n");
        const parsedRows = extractStudentRowsFromText(tabText);
        const sortedRows = processAndSortNameRows(parsedRows);
        setImportPreviewCodes(sortedRows.map((row) => row.studentCode));
        const sortedList = sortedRows.map((row) => row.fullName);
        if (sortedList.length === 0) { alert("Không tìm thấy danh sách tên học sinh hợp lệ trong tệp Excel này!"); return; }
        setImportPreviewNames(sortedList);
        setShowImportModal(true);
      } catch (err) {
        alert("Lỗi đọc tệp Excel: " + (err instanceof Error ? err.message : "Tệp không hợp lệ."));
      }
    } else {
      // File văn bản txt/csv
      const reader = new FileReader();
      reader.onerror = () => alert("Không đọc được tệp văn bản. Hãy thử lưu lại dưới dạng UTF-8.");
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const parsedRows = extractStudentRowsFromText(text);
          const sortedRows = processAndSortNameRows(parsedRows);
          setImportPreviewCodes(sortedRows.map((row) => row.studentCode));
          const sortedList = sortedRows.map((row) => row.fullName);
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
    const className = studentClassName.normalize("NFC").trim();
    if (!className || className.length > 40) { alert("Tên lớp cần dài từ 1 đến 40 ký tự."); return; }
    if (previewMode) {
      const duplicateNames = importPreviewNames.filter((name) => hasStudentInClass(students, name, className));
      if (duplicateNames.length && !confirm(`${duplicateNames.length} tên đã có hồ sơ trong lớp ${className}. Tạo hồ sơ riêng cho các em này?`)) return;
      const incoming = importPreviewNames.map((full_name, index) => ({ id: `preview-import-${Date.now()}-${index}`, full_name, class_name: className }));
      setStudents((current) => [...current, ...incoming].sort(sortVietnameseNames));
      setShowImportModal(false); setImportPreviewNames([]); setImportPreviewCodes([]); setPasteNamesText("");
      setPreviewNotice(`Đã thêm thử ${incoming.length} học sinh vào lớp mẫu.`);
      return;
    }
    const duplicateNames = importPreviewNames.filter((name) => hasStudentInClass(students, name, className));
    if (duplicateNames.length && !confirm(`${duplicateNames.length} tên đã có hồ sơ trong lớp ${className}. Nếu là học sinh khác nhau, hãy tiếp tục tạo tài khoản riêng?`)) return;
    if (importPreviewNames.length > 500) { alert("Mỗi lượt tối đa 500 học sinh."); return; }

    setIsSavingStudents(true);
    try {
      const allResults: Array<{ ok: boolean; student?: any; credentials?: { username: string; password: string }; error?: string; index: number }> = [];
      let importFatalError = "";
      for (let offset = 0; offset < importPreviewNames.length; offset += 100) {
        const batch = importPreviewNames.slice(offset, offset + 100);
        try {
          const response = await fetch("/api/teacher/students/bulk", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              class_name: className,
              students: batch.map((full_name, localIndex) => ({
                full_name,
                student_code: importPreviewCodes[offset + localIndex] || "",
              })),
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            const reason = result.error || `Không nhập được lượt ${Math.floor(offset / 100) + 1}.`;
            allResults.push(...batch.map((_name, index) => ({ index: offset + index, ok: false, error: reason })));
            if ([401, 403, 429].includes(response.status)) { importFatalError = reason; break; }
            continue;
          }
          allResults.push(...result.results.map((row: any) => ({ ...row, index: offset + row.index })));
        } catch (batchError) {
          const reason = batchError instanceof Error ? batchError.message : "Mất kết nối khi nhập lô này.";
          allResults.push(...batch.map((_name, index) => ({ index: offset + index, ok: false, error: reason })));
          importFatalError = reason;
          break;
        }
      }
      const successful = allResults.filter((row) => row.ok && row.student && row.credentials);
      const failed = allResults.filter((row) => !row.ok);
      const newStudents = successful.map((row) => row.student);
      setStudents((current) => {
        const ids = new Set(current.map((student) => student.id));
        return [...current, ...newStudents.filter((student) => !ids.has(student.id))].sort(sortVietnameseNames);
      });
      if (successful.length) {
        setAccountStudent({ full_name: `${successful.length} tài khoản học sinh` });
        setStudentAccountCredentials(successful.map((row) => ({ username: row.credentials!.username, password: row.credentials!.password, studentName: row.student.full_name })));
        setStudentAccountNotice(`Đã tạo ${successful.length} tài khoản. Mật khẩu chỉ hiển thị trong phiên này; hãy sao chép hoặc in ngay.`);
        setStudentAccountError("");
      }
      setShowImportModal(false); setImportPreviewNames([]); setImportPreviewCodes([]); setPasteNamesText("");
      if (failed.length || importFatalError) {
        const summary = failed.slice(0, 8).map((row) => `Dòng ${row.index + 1}: ${row.error || "lỗi không xác định"}`).join("\n");
        alert(`Đã tạo ${successful.length}/${allResults.length} tài khoản. ${failed.length} dòng lỗi.${importFatalError ? `\n${importFatalError}` : ""}${summary ? `\n${summary}` : ""}${failed.length > 8 ? "\n…" : ""}`);
      } else if (!successful.length) alert("Không có tài khoản nào được tạo.");
    } catch (error: unknown) {
      alert("Lỗi nhập danh sách: " + (error instanceof Error ? error.message : "Lỗi kết nối máy chủ."));
    } finally { setIsSavingStudents(false); }
  };
  // Mục 5: xuất Excel toàn bộ danh sách tài khoản để giáo viên gửi về lớp.
  // Chỉ xuất username; với mật khẩu, nếu học sinh đã đổi thì ghi rõ "Đã đổi mật khẩu"
  // thay vì để lộ mật khẩu (bảo mật). Mật khẩu tạm đã tạo xem được ở phiên cấp tài khoản.
  const exportStudentAccountsExcel = async (roster: any[]) => {
    if (!roster.length) { alert("Chưa có học sinh để xuất."); return; }
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "VatLy11";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet("Danh sách tài khoản");
      sheet.columns = [
        { header: "STT", key: "index", width: 6 },
        { header: "Mã số sinh viên", key: "studentCode", width: 18 },
        { header: "Họ và tên", key: "fullName", width: 28 },
        { header: "Lớp", key: "className", width: 10 },
        { header: "Tên đăng nhập", key: "username", width: 24 },
        { header: "Trạng thái mật khẩu", key: "passwordState", width: 22 },
        { header: "Tài khoản", key: "accountState", width: 16 },
      ];
      sheet.getRow(1).font = { bold: true };
      roster.forEach((student, index) => {
        sheet.addRow({
          index: index + 1,
          studentCode: student.student_code || "",
          fullName: student.full_name || "",
          className: student.class_name || "",
          username: student.username || "",
          passwordState: student.password_changed ? "Đã đổi mật khẩu" : (student.auth_user_id ? "Mật khẩu tạm (xem phiên cấp)" : "Chưa cấp"),
          accountState: student.auth_user_id ? "Đã cấp" : "Chưa cấp",
        });
      });
      sheet.eachRow((row) => row.eachCell((cell) => { cell.font = { ...(cell.font || {}), name: "Arial" }; }));
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `danh-sach-tai-khoan-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Không xuất được file Excel: " + (error instanceof Error ? error.message : "lỗi không xác định."));
    }
  };

  const deleteStudent = async (id: string) => {
    const student = students.find((item) => item.id === id);
    if (!student || studentArchiveBusyId) return;
    const restoring = student.is_active === false;
    if (previewMode) {
      setStudents((current) => current.map((item) => item.id === id ? { ...item, is_active: restoring } : item));
      setPreviewNotice(restoring
        ? "Đã khôi phục thử " + student.full_name + " trong danh sách lớp mẫu."
        : "Đã lưu trữ thử " + student.full_name + "; dữ liệu mẫu vẫn còn trong phiên này.");
      return;
    }
    if (studentArchiveSchemaMissing) {
      alert("Cần áp dụng migration 20261103000200_student_archive.sql trước khi lưu trữ hoặc khôi phục học sinh.");
      return;
    }
    const action = restoring ? "khôi phục" : "lưu trữ";
    const detail = restoring
      ? "Khôi phục " + student.full_name + " vào danh sách lớp? Hồ sơ này cần được cấp tài khoản mới trước khi học sinh đăng nhập."
      : "Lưu trữ " + student.full_name + "? Tài khoản sẽ bị khóa; bài nộp, điểm và lịch sử nhóm vẫn được giữ.";
    if (!confirm(detail)) return;

    setStudentArchiveBusyId(id);
    try {
      const response = await fetch("/api/teacher/students/" + encodeURIComponent(id), { method: restoring ? "PATCH" : "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể " + action + " học sinh.");
      setStudents((current) => current.map((item) => item.id === id
        ? { ...item, is_active: restoring, auth_user_id: restoring ? item.auth_user_id : null }
        : item));
      alert(restoring
        ? "Đã khôi phục hồ sơ. Hãy cấp tài khoản mới nếu học sinh cần đăng nhập."
        : "Đã lưu trữ học sinh và khóa tài khoản. Bài nộp, điểm và lịch sử vẫn được giữ.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể " + action + " học sinh.");
    } finally {
      setStudentArchiveBusyId(null);
    }
  };
  const openStudentAccountModal = (student: any) => {
    if (previewMode || !canProvisionStudentAccounts || student.is_active === false) return;
    setAccountStudent(student);
    setStudentAccountCredentials(null);
    setStudentAccountError("");
    setStudentAccountNotice("");
  };

  const createStudentAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (previewMode || !canProvisionStudentAccounts || !accountStudent?.id || accountStudent.is_active === false || isCreatingStudentAccount) return;
    setIsCreatingStudentAccount(true);
    setStudentAccountError("");
    setStudentAccountNotice("");
    try {
      const response = await fetch("/api/teacher/student-accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: accountStudent.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không cấp được tài khoản.");
      setStudentAccountCredentials([{ username: result.credentials.username, password: result.credentials.password, studentName: accountStudent.full_name }]);
      setStudentAccountNotice("Mật khẩu tạm chỉ hiển thị trong lần này. Hãy sao chép hoặc in và gửi riêng cho học sinh.");
      await fetchData();
    } catch (accountError) {
      setStudentAccountError(accountError instanceof Error ? accountError.message : "Không cấp được tài khoản học sinh.");
    } finally { setIsCreatingStudentAccount(false); }
  };

  const closeStudentAccountModal = () => {
    setAccountStudent(null);
    setStudentAccountCredentials(null);
    setStudentAccountError("");
    setStudentAccountNotice("");
  };  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleSmartFileUpload(event);
  };
  // --- TRẮC NGHIỆM & CHAT ---
  const createQuiz = async () => {
    if (!quizTitle.trim()) return alert("Nhập tên bài trắc nghiệm!");
    const validQuestions = newQs.filter((question) => question.question.trim() && question.options.every((option) => option.trim()));
    if (!validQuestions.length) return alert("Cần ít nhất một câu hỏi có đủ bốn lựa chọn.");

    if (previewMode) {
      setQuizzes((current) => [...current, { id: `preview-quiz-${Date.now()}`, title: quizTitle.trim(), activity_id: quizActivity, time_limit: quizTime, question_count: validQuestions.length }]);
      setQuizTitle(""); setNewQs([{ question: "", image_url: "", options: ["", "", "", ""], correct_option: 0, explanation: "" }]);
      setPreviewNotice(`Đã tạo thử bài trắc nghiệm có ${validQuestions.length} câu trong phiên xem trước.`);
      return;
    }

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
    if (previewMode) {
      setMessages((current) => [...current, { id: `preview-message-${Date.now()}`, sender_name: "Cô Hương Xuân (Giáo viên)", content: newMsg.trim(), attachment_name: chatFile?.name || null, attachment_type: chatFile?.type || null, created_at: new Date().toISOString() }]);
      setNewMsg(""); setChatFile(null); setPreviewNotice("Đã gửi tin nhắn vào kênh chat mẫu. Tệp chỉ hiển thị tên, không được tải lên máy chủ.");
      return;
    }
    setIsSendingChat(true);
    try {
      let attachment: Record<string, string> = {};
      if (chatFile) {
        if (chatFile.size > MAX_CHAT_ATTACHMENT_BYTES) throw new Error("Tệp chat tối đa 25 MB.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        const contentType = chatAttachmentMimeType(chatFile);
        const safeName = chatFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `chat/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("class-work").upload(path, chatFile, { upsert: false, contentType });
        if (uploadError) throw uploadError;
        attachment = { attachment_url: path, attachment_name: chatFile.name, attachment_type: contentType };
      }
      const { error } = await supabase.from("messages").insert([{ sender_name: "Cô Hương Xuân (Giáo viên)", content: newMsg.trim(), ...attachment }]);
      if (error) throw error;
      setNewMsg(""); setChatFile(null); await fetchData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không gửi được tin nhắn.");
    } finally { setIsSendingChat(false); }
  };

  const deleteMessage = async (message: any) => {
    if (previewMode) {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      setPreviewNotice("Đã xóa tin nhắn khỏi kênh chat mẫu.");
      return;
    }
    if (!confirm("Xóa tin nhắn này khỏi kênh chat?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) { alert("Không xóa được tin nhắn: " + error.message); return; }
    setMessages((current) => current.filter((item) => item.id !== message.id));
    if (message.attachment_url && !message.attachment_url.startsWith("http")) {
      const { error: fileError } = await supabase.storage.from("class-work").remove([message.attachment_url]);
      if (fileError) alert("Tin nhắn đã xóa, nhưng chưa dọn được tệp đính kèm: " + fileError.message);
    }
    await fetchData();
  };
  const exportExcelReport = async () => {
    if (isExportingReport) return;
    setIsExportingReport(true);
    setReportExportError("");
    setReportExportSuccess("");
    try {
    let reportStudents: any[] = students;
    let reportActivities: any[] = activities;
    let reportGradingGuides: any[] = [];
    let reportSubmissions: any[] = submissions;
    let reportEvidence: any[] = [];
    let reportQuizResults: any[] = [];
    let reportGroupAssignments: any[] = groupAssignments;
    let reportGroups: any[] = [];
    let reportGroupSubmissions: any[] = groupSubmissions;

    if (!previewMode) {
      [reportStudents, reportActivities, reportGradingGuides, reportSubmissions, reportEvidence, reportQuizResults, reportGroupAssignments, reportGroups, reportGroupSubmissions] = await Promise.all([
        readAllReportRows((from, to) => supabase.from("students").select("*").order("id").range(from, to), "Danh sách học sinh"),
        readAllReportRows((from, to) => supabase.from("activities").select("*").order("id").range(from, to), "Danh sách bài học"),
        readAllActivityRubricRows(),
        readAllReportRows((from, to) => supabase.from("submissions").select("*").order("id").range(from, to), "Bài nộp cá nhân"),
        readAllReportRows((from, to) => supabase.from("activity_evidence").select("id,student_id,activity_id,evidence,score,score_max,completed_at,created_at,updated_at,ai_score,ai_feedback,ai_strengths,ai_weaknesses,teacher_score,teacher_feedback,graded_at,students(full_name,class_name)").order("id").range(from, to), "Sổ tay hoạt động"),
        readAllReportRows((from, to) => supabase.from("quiz_submissions").select("id,quiz_id,student_id,score,created_at,time_spent_seconds,students(full_name,class_name),quizzes(title,activity_id)").order("id").range(from, to), "Kết quả trắc nghiệm"),
        readAllReportRows((from, to) => supabase.from("group_assignments").select("*").order("id").range(from, to), "Bài tập nhóm"),
        readAllReportRows((from, to) => supabase.from("group_assignment_groups").select("id,assignment_id,group_number,group_name,group_assignment_members(id,student_id,students(full_name,class_name))").order("id").range(from, to), "Phân nhóm"),
        readAllReportRows((from, to) => supabase.from("group_submissions").select("*").order("id").range(from, to), "Bài nộp nhóm"),
      ]);
    }
    const workbook = new ExcelJS.Workbook();
    const generatedAt = new Date();
    workbook.creator = "Vật lí 11";
    workbook.created = generatedAt;
    workbook.modified = generatedAt;

    const navy = "17365D";
    const blue = "2563EB";
    const paleBlue = "DBEAFE";
    const paleGreen = "DCFCE7";
    const paleAmber = "FEF3C7";
    const paleRose = "FEE2E2";
    const white = "FFFFFF";
    const longContentChunks: Array<{ source: string; recordId: string; field: string; part: number; total: number; content: string }> = [];
    const formulaSafe = (value: unknown) => {
      if (typeof value !== "string") return value ?? "";
      return /^[=+\-@]/.test(value) ? `'${value}` : value;
    };
    const cellText = (value: unknown, source: string, recordId: unknown, field: string, maxLength = 30_000) => {
      const text = typeof value === "string" ? value : value && typeof value === "object" ? JSON.stringify(value) || String(value) : String(value ?? "");
      if (text.length <= maxLength) return formulaSafe(text);
      const parts = splitExcelCellText(text, maxLength);
      const id = String(recordId ?? "");
      parts.forEach((content, index) => longContentChunks.push({ source, recordId: id, field, part: index + 1, total: parts.length, content }));
      return formulaSafe(`Nội dung dài: sheet "Nội dung dài" · ${source} · ${id} · ${field} (${parts.length} phần)`);
    };
    const activityById = new Map(reportActivities.map((activity: any) => [String(activity.id), activity]));
    const studentById = new Map(reportStudents.map((student: any) => [String(student.id), student]));
    const groupAssignmentById = new Map(reportGroupAssignments.map((assignment: any) => [String(assignment.id), assignment]));
    const activityTitle = (activityId: number) => activityById.get(String(activityId))?.title || `Hoạt động ${activityId}`;
    const scoreText = (score: unknown) => score === null || score === undefined || score === "" ? null : Number.isFinite(Number(score)) ? Number(score) : null;
    const aiScoreText = (score: unknown) => {
      const value = scoreText(score);
      return value === -1 ? null : value;
    };
    const approvedScore = (submission: any) => scoreText(submission.final_score);
    const reviewStatus = (submission: any, officialScore = submission.final_score) => scoreText(officialScore) !== null ? "Đã duyệt điểm giáo viên" : aiScoreText(submission.ai_score) !== null ? "Có gợi ý AI · chờ giáo viên duyệt" : submission.status === "pending" ? "Chờ giáo viên xem" : submission.completed_at ? "Đã nộp · chờ giáo viên xem" : submission.evidence !== undefined ? "Đang lưu tiến độ" : String(submission.status || "Chưa rõ");
    const classNameOf = (student: any) => student.class_name || "Chưa xếp lớp";
    const byKey = <T,>(rows: T[], keyOf: (row: T) => unknown) => {
      const result = new Map<string, T[]>();
      rows.forEach((row) => {
        const key = keyOf(row);
        if (key === null || key === undefined) return;
        const normalized = String(key);
        const values = result.get(normalized) || [];
        values.push(row);
        result.set(normalized, values);
      });
      return result;
    };
    const submissionsByStudent = byKey(reportSubmissions, (record: any) => record.student_id);
    const evidenceByStudent = byKey(reportEvidence, (record: any) => record.student_id);
    const quizResultsByStudent = byKey(reportQuizResults, (record: any) => record.student_id);
    const submissionsByActivity = byKey(reportSubmissions, (record: any) => record.activity_id);
    const evidenceByActivity = byKey(reportEvidence, (record: any) => record.activity_id);
    const groupSubmissionsByAssignment = byKey(reportGroupSubmissions, (record: any) => record.assignment_id);
    const quizzesByActivity = byKey(reportQuizResults, (record: any) => {
      const quiz = Array.isArray(record.quizzes) ? record.quizzes[0] : record.quizzes;
      return quiz?.activity_id;
    });
    const groupCounts = new Map<string, number>();
    const groupsByAssignment = new Map<string, any[]>();
    const groupsById = new Map<string, any>();
    const groupSubmissionsByGroup = byKey(reportGroupSubmissions, (record: any) => record.group_id);
    reportGroups.forEach((group: any) => {
      const list = groupsByAssignment.get(group.assignment_id) || [];
      list.push(group);
      groupsByAssignment.set(group.assignment_id, list);
      groupsById.set(group.id, group);
    });
    groupsByAssignment.forEach((groups, assignmentId) => groupCounts.set(String(assignmentId), groups.length));
    const groupSubmissionsByStudent = new Map<string, any[]>();
    reportGroups.forEach((group: any) => {
      const members = Array.isArray(group.group_assignment_members) ? group.group_assignment_members : [];
      const submissionsForGroup = groupSubmissionsByGroup.get(String(group.id)) || [];
      members.forEach((member: any) => {
        const key = String(member.student_id);
        const existing = groupSubmissionsByStudent.get(key) || [];
        existing.push(...submissionsForGroup);
        groupSubmissionsByStudent.set(key, existing);
      });
    });

    const styleSheet = (sheet: ExcelJS.Worksheet, title: string, subtitle: string, headers: string[], widths: number[]) => {
      sheet.views = [{ state: "frozen", ySplit: 4 }];
      sheet.properties.defaultRowHeight = 19;
      sheet.mergeCells(1, 1, 1, headers.length);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = title;
      titleCell.font = { name: "Aptos", size: 16, bold: true, color: { argb: white } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
      titleCell.alignment = { horizontal: "left", vertical: "middle" };
      sheet.getRow(1).height = 28;
      sheet.mergeCells(2, 1, 2, headers.length);
      const subtitleCell = sheet.getCell(2, 1);
      subtitleCell.value = subtitle;
      subtitleCell.font = { name: "Aptos", size: 10, italic: true, color: { argb: "475569" } };
      subtitleCell.alignment = { vertical: "middle" };
      sheet.getRow(2).height = 22;
      sheet.getRow(4).values = headers;
      sheet.getRow(4).height = 24;
      sheet.getRow(4).eachCell((cell) => {
        cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: blue } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = { bottom: { style: "thin", color: { argb: white } } };
      });
      widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
    };
    const styleDataRows = (sheet: ExcelJS.Worksheet, scoreColumns: number[] = [], dateColumns: number[] = []) => {
      const finalRow = sheet.rowCount;
      if (finalRow >= 5) sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: finalRow, column: Math.max(1, sheet.columnCount) } };
      for (let rowNumber = 5; rowNumber <= finalRow; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        row.eachCell((cell, columnNumber) => {
          cell.font = { name: "Aptos", size: 10, color: { argb: "0F172A" } };
          cell.alignment = { vertical: "top", wrapText: columnNumber > 7 };
          cell.border = { bottom: { style: "hair", color: { argb: "CBD5E1" } } };
          if (rowNumber % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
        });
        scoreColumns.forEach((column) => {
          const score = scoreText(row.getCell(column).value);
          if (score === null) return;
          const cell = row.getCell(column);
          cell.numFmt = "0.0";
          cell.alignment = { horizontal: "center", vertical: "top" };
          cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: score >= 8 ? "166534" : score >= 5 ? "92400E" : "B91C1C" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: score >= 8 ? paleGreen : score >= 5 ? paleAmber : paleRose } };
        });
        dateColumns.forEach((column) => {
          const cell = row.getCell(column);
          if (cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy hh:mm";
        });
      }
    };

    const officialScores = [
      ...reportSubmissions.map((submission: any) => submission.final_score),
      ...reportEvidence.map((record: any) => record.teacher_score),
      ...reportGroupSubmissions.map((submission: any) => submission.final_score),
    ].map(scoreText).filter((score): score is number => score !== null);
    const average = officialScores.length ? officialScores.reduce((total, score) => total + score, 0) / officialScores.length : null;
    const aiSuggestionCount = [reportSubmissions, reportEvidence, reportGroupSubmissions].flat().filter((record: any) => aiScoreText(record.ai_score) !== null).length;
    const awaitingTeacherReview = countAwaitingTeacherReview({
      individualSubmissions: reportSubmissions,
      activityEvidence: reportEvidence,
      groupSubmissions: reportGroupSubmissions,
    });
    const summary = workbook.addWorksheet("Tổng quan");
    styleSheet(summary, "Báo cáo lớp học Vật lí 11", `Thời điểm xuất: ${generatedAt.toLocaleString("vi-VN")} · Đã tải toàn bộ các bảng theo từng trang dữ liệu`, ["Chỉ số", "Giá trị", "Ghi chú"], [34, 18, 68]);
    summary.addRows([
      ["Tổng số học sinh", reportStudents.length, "Danh sách hồ sơ lớp, không cắt theo giới hạn màn hình"],
      ["Bài học", reportActivities.length, "Toàn bộ hoạt động hiện có trong cơ sở dữ liệu"],
      ["Bài nộp cá nhân", reportSubmissions.length, "Bảng bài nộp tự luận / đính kèm"],
      ["Hồ sơ hoạt động", reportEvidence.length, "Sổ tay, thí nghiệm, phiếu trả lời và bằng chứng"],
      ["Kết quả trắc nghiệm", reportQuizResults.length, "Các bài trắc nghiệm do giáo viên tạo"],
      ["Bài tập nhóm", reportGroupAssignments.length, "Nhiệm vụ nhóm đã giao"],
      ["Bài nộp nhóm", reportGroupSubmissions.length, "Tổng kết bài nộp theo nhóm"],
      ["Bản ghi có điểm GV duyệt", officialScores.length, "Chỉ tính điểm chính thức do giáo viên chốt"],
      ["Điểm chính thức trung bình", average, average === null ? "Chưa có điểm giáo viên duyệt" : "Trung bình trên thang điểm 10; không trộn điểm AI"],
      ["Bản ghi chờ giáo viên duyệt", awaitingTeacherReview, "Bài cá nhân/nhóm đang chờ và hồ sơ hoạt động đã nộp; bỏ qua bản nháp và phiếu khảo sát"],
      ["Bản ghi có gợi ý AI", aiSuggestionCount, "Điểm AI là gợi ý, không tính vào điểm chính thức"],
      ["Phạm vi xuất", "Đầy đủ", "Mỗi bảng được tải theo trang; báo lỗi nếu một bảng vượt 50.000 dòng"],
    ]);
    summary.getCell("B13").numFmt = "0.0";
    summary.mergeCells(19, 1, 19, 3);
    summary.getCell("A19").value = "Phân bố điểm giáo viên đã duyệt";
    summary.getCell("A19").font = { name: "Aptos", size: 11, bold: true, color: { argb: navy } };
    summary.getRow(20).values = ["Mức điểm", "Số bài", "Tỷ lệ"];
    summary.getRow(20).eachCell((cell: ExcelJS.Cell) => { cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: white } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: blue } }; cell.alignment = { horizontal: "center" }; });
    const bands = [["Từ 8,0 đến 10", 8, 10], ["Từ 6,5 đến dưới 8,0", 6.5, 8], ["Từ 5,0 đến dưới 6,5", 5, 6.5], ["Dưới 5,0", -Infinity, 5]];
    bands.forEach(([label, min, max]) => {
      const count = officialScores.filter((score) => score >= Number(min) && score < Number(max)).length;
      summary.addRow([label, count, officialScores.length ? count / officialScores.length : null]);
    });
    for (let row = 21; row <= 24; row += 1) { summary.getCell(row, 3).numFmt = "0.0%"; }
    for (const rowNumber of [...Array.from({ length: 12 }, (_, index) => index + 5), 21, 22, 23, 24]) {
      const row = summary.getRow(rowNumber);
      row.eachCell((cell) => {
        cell.font = { name: "Aptos", size: 10, color: { argb: "0F172A" } };
        cell.alignment = { vertical: "top", wrapText: true };
        cell.border = { bottom: { style: "hair", color: { argb: "CBD5E1" } } };
        if (rowNumber % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
      });
    }

    const roster = workbook.addWorksheet("Danh sách học sinh");
    styleSheet(roster, "Danh sách học sinh", "Tình trạng tài khoản, tiến độ cá nhân và bài nhóm được ghép theo mã hồ sơ thành viên.", ["STT", "Mã học sinh", "Họ và tên", "Lớp", "Tên đăng nhập", "Tài khoản", "Bài nộp cá nhân", "Bài nộp nhóm", "Hồ sơ hoạt động", "Lượt trắc nghiệm", "Điểm GV TB (cá nhân + nhóm)", "AI gần nhất", "Hoạt động gần nhất"], [8, 38, 28, 16, 30, 16, 16, 15, 17, 15, 24, 15, 21]);
    reportStudents.forEach((student: any, index: number) => {
      const studentSubmissions = submissionsByStudent.get(String(student.id)) || [];
      const studentEvidence = evidenceByStudent.get(String(student.id)) || [];
      const studentQuizzes = quizResultsByStudent.get(String(student.id)) || [];
      const studentGroupSubmissions = groupSubmissionsByStudent.get(String(student.id)) || [];
      const official = [...studentSubmissions.map((record: any) => record.final_score), ...studentEvidence.map((record: any) => record.teacher_score), ...studentGroupSubmissions.map((record: any) => record.final_score)].map(scoreText).filter((score): score is number => score !== null);
      const aiSuggestions = [...studentSubmissions, ...studentEvidence, ...studentGroupSubmissions].filter((record: any) => aiScoreText(record.ai_score) !== null).sort((a: any, b: any) => new Date(b.updated_at || b.submitted_at || 0).getTime() - new Date(a.updated_at || a.submitted_at || 0).getTime());
      const latestDates = [...studentSubmissions.map((record: any) => record.submitted_at), ...studentEvidence.map((record: any) => record.updated_at), ...studentQuizzes.map((record: any) => record.created_at), ...studentGroupSubmissions.map((record: any) => record.submitted_at)].filter(Boolean).map((date) => new Date(date as string).getTime()).filter(Number.isFinite);
      const lastActivity = latestDates.length ? new Date(Math.max(...latestDates)) : null;
      roster.addRow([index + 1, formulaSafe(student.id), formulaSafe(student.full_name), formulaSafe(classNameOf(student)), formulaSafe(student.username || ""), student.auth_user_id ? "Đã cấp" : "Chưa cấp", studentSubmissions.length, studentGroupSubmissions.length, studentEvidence.length, studentQuizzes.length, official.length ? official.reduce((sum, score) => sum + score, 0) / official.length : null, aiSuggestions.length ? aiScoreText(aiSuggestions[0].ai_score) : null, lastActivity]);
    });
    styleDataRows(roster, [11, 12], [13]);

    const classMetrics = buildClassReportMetrics({
      students: reportStudents,
      individualSubmissions: reportSubmissions,
      activityEvidence: reportEvidence,
      quizResults: reportQuizResults,
      groupAssignments: reportGroupAssignments,
      groups: reportGroups,
      groupSubmissions: reportGroupSubmissions,
    });
    const classSheet = workbook.addWorksheet("Thống kê theo lớp");
    styleSheet(classSheet, "Thống kê kết quả theo lớp", "Điểm trung bình được tính bằng trung bình điểm chính thức của từng học sinh, sau đó lấy trung bình các học sinh đã có điểm; mỗi em có trọng số như nhau.", ["Lớp", "Sĩ số", "HS có hoạt động", "Tỷ lệ hoạt động", "Bài nộp cá nhân", "Hồ sơ hoạt động đã nộp", "Lượt trắc nghiệm", "Bài nhóm áp dụng", "Bài nộp nhóm", "Bản ghi chờ duyệt", "HS có điểm GV", "Bản ghi điểm GV", "Điểm GV TB / HS"], [20, 12, 16, 16, 18, 23, 17, 18, 16, 19, 17, 19, 20]);
    classMetrics.forEach((row) => classSheet.addRow([
      formulaSafe(row.className), row.studentCount, row.activeStudentCount,
      row.studentCount ? row.activeStudentCount / row.studentCount : null,
      row.individualSubmissionCount, row.submittedEvidenceCount, row.quizAttemptCount,
      row.groupAssignmentCount, row.groupSubmissionCount, row.pendingReviewCount,
      row.scoredStudentCount, row.officialScoreRecordCount, row.averageOfficialScorePerStudent,
    ]));
    styleDataRows(classSheet, [13]);
    for (let rowNumber = 5; rowNumber <= classSheet.rowCount; rowNumber += 1) classSheet.getCell(rowNumber, 4).numFmt = "0.0%";

    const activitySheet = workbook.addWorksheet("Bài học");
    styleSheet(activitySheet, "Bài học và tiến độ", "Tổng hợp trạng thái mở bài và các bản ghi cá nhân theo từng hoạt động; điểm trung bình chỉ gồm điểm giáo viên.", ["Mã", "Tên bài học", "Giai đoạn", "Loại", "Thời lượng", "Trạng thái", "Hạn nộp", "Nhận bài", "Bài nộp", "Hồ sơ hoạt động", "Trắc nghiệm", "Điểm GV TB"], [10, 42, 15, 16, 18, 15, 21, 13, 14, 17, 13, 14]);
    reportActivities.forEach((activity: any) => {
      const activitySubmissions = submissionsByActivity.get(String(activity.id)) || [];
      const activityEvidence = evidenceByActivity.get(String(activity.id)) || [];
      const activityQuizResults = quizzesByActivity.get(String(activity.id)) || [];
      const finalScores = [...activitySubmissions.map((record: any) => record.final_score), ...activityEvidence.map((record: any) => record.teacher_score)].map(scoreText).filter((score): score is number => score !== null);
      activitySheet.addRow([activity.id, formulaSafe(activity.title), formulaSafe(activity.phase || ""), formulaSafe(activity.type || ""), formulaSafe(activity.duration || ""), activity.status === "available" ? "Đang mở" : formulaSafe(activity.status || "Khóa"), activity.deadline ? new Date(activity.deadline) : null, activity.accepting_submissions === false ? "Đã đóng" : "Đang nhận", activitySubmissions.length, activityEvidence.length, activityQuizResults.length, finalScores.length ? finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length : null]);
    });
    styleDataRows(activitySheet, [12], [7]);

    const gradingGuideByActivity = new Map(reportGradingGuides.map((guide: any) => [String(guide.activity_id), guide]));
    const rubricSheet = workbook.addWorksheet("Ma trận chấm điểm");
    styleSheet(rubricSheet, "Ma trận chấm điểm cá nhân và nhóm", "Nội dung ma trận đã lưu trong hệ thống; công thức được giữ nguyên dạng văn bản để cô có thể sửa và đối chiếu với file gốc.", ["Loại nhiệm vụ", "Mã", "Tên bài / nhiệm vụ", "Nội dung ma trận", "File gốc", "Tình trạng"], [18, 18, 40, 86, 36, 20]);
    reportActivities.forEach((activity: any) => {
      const guide: any = gradingGuideByActivity.get(String(activity.id));
      const rubric = guide?.grading_rubric || "";
      rubricSheet.addRow([
        "Cá nhân",
        formulaSafe(activity.id),
        formulaSafe(activity.title || `Hoạt động ${activity.id}`),
        rubric ? cellText(rubric, "Ma trận chấm điểm", activity.id, "Ma trận cá nhân") : "Chưa nhập ma trận",
        formulaSafe(guide?.rubric_document_name || ""),
        rubric ? "Đã có ma trận" : "Chưa nhập",
      ]);
    });
    reportGroupAssignments.forEach((assignment: any) => {
      const rubric = assignment.rubric || "";
      rubricSheet.addRow([
        "Nhóm",
        formulaSafe(assignment.id),
        formulaSafe(assignment.title || "Bài tập nhóm"),
        rubric ? cellText(rubric, "Ma trận chấm điểm", assignment.id, "Ma trận nhóm") : "Chưa nhập ma trận",
        formulaSafe(assignment.rubric_document_name || ""),
        rubric ? "Đã có ma trận" : "Chưa nhập",
      ]);
    });
    styleDataRows(rubricSheet);

    const progressByPair = new Map<string, any>();
    const addProgressRecord = (studentId: unknown, activityId: unknown, kind: "submission" | "evidence" | "quiz", record: any) => {
      if (!studentId || activityId === null || activityId === undefined) return;
      const key = `${String(studentId)}:${String(activityId)}`;
      const progress = progressByPair.get(key) || { studentId: String(studentId), activityId: String(activityId), submissions: 0, evidence: 0, quizzes: 0, officialScores: [], quizScores: [], aiScores: [], latest: 0 };
      progress[kind === "submission" ? "submissions" : kind === "evidence" ? "evidence" : "quizzes"] += 1;
      const official = kind === "evidence" ? record.teacher_score : kind === "quiz" ? null : record.final_score;
      const officialScore = scoreText(official);
      if (officialScore !== null) progress.officialScores.push(officialScore);
      const quizScore = kind === "quiz" ? scoreText(record.score) : null;
      if (quizScore !== null) progress.quizScores.push(quizScore);
      const aiScore = aiScoreText(record.ai_score);
      if (aiScore !== null) progress.aiScores.push(aiScore);
      const occurredAt = new Date(record.updated_at || record.submitted_at || record.completed_at || record.created_at || 0).getTime();
      if (Number.isFinite(occurredAt)) progress.latest = Math.max(progress.latest, occurredAt);
      progressByPair.set(key, progress);
    };
    reportSubmissions.forEach((record: any) => addProgressRecord(record.student_id, record.activity_id, "submission", record));
    reportEvidence.forEach((record: any) => addProgressRecord(record.student_id, record.activity_id, "evidence", record));
    reportQuizResults.forEach((record: any) => {
      const quiz = Array.isArray(record.quizzes) ? record.quizzes[0] : record.quizzes;
      addProgressRecord(record.student_id, quiz?.activity_id, "quiz", record);
    });
    const progressSheet = workbook.addWorksheet("Tiến độ học sinh");
    styleSheet(progressSheet, "Tiến độ học sinh theo bài", "Chỉ liệt kê cặp học sinh và bài có phát sinh dữ liệu; bài chưa có lượt làm vẫn được thống kê trong sheet Bài học.", ["Mã học sinh", "Học sinh", "Lớp", "Mã bài", "Tên bài", "Bài nộp", "Hồ sơ hoạt động", "Lượt trắc nghiệm", "Điểm GV TB", "Điểm quiz TB", "AI TB (tham khảo)", "Hoạt động gần nhất"], [38, 28, 16, 10, 42, 12, 17, 15, 14, 15, 17, 21]);
    [...progressByPair.values()].sort((a, b) => (studentById.get(a.studentId)?.full_name || "").localeCompare(studentById.get(b.studentId)?.full_name || "", "vi") || a.activityId.localeCompare(b.activityId, "vi", { numeric: true })).forEach((progress) => {
      const student: any = studentById.get(progress.studentId) || {};
      const officialAvg = progress.officialScores.length ? progress.officialScores.reduce((sum: number, score: number) => sum + score, 0) / progress.officialScores.length : null;
      const quizAvg = progress.quizScores.length ? progress.quizScores.reduce((sum: number, score: number) => sum + score, 0) / progress.quizScores.length : null;
      const aiAvg = progress.aiScores.length ? progress.aiScores.reduce((sum: number, score: number) => sum + score, 0) / progress.aiScores.length : null;
      progressSheet.addRow([formulaSafe(progress.studentId), formulaSafe(student.full_name || "Hồ sơ đã xóa"), formulaSafe(classNameOf(student)), Number(progress.activityId), formulaSafe(activityTitle(Number(progress.activityId))), progress.submissions, progress.evidence, progress.quizzes, officialAvg, quizAvg, aiAvg, progress.latest ? new Date(progress.latest) : null]);
    });
    styleDataRows(progressSheet, [9, 10, 11], [12]);

    const submissionSheet = workbook.addWorksheet("Bài nộp cá nhân");
    styleSheet(submissionSheet, "Bài nộp và chấm điểm", "Điểm giáo viên là điểm chính thức; điểm AI chỉ là gợi ý. Học sinh được ghép bằng mã hồ sơ, không ghép theo tên.", ["Mã bài nộp", "Mã học sinh", "Học sinh", "Lớp", "Mã bài", "Tên bài", "Điểm giáo viên", "Gợi ý AI", "Trạng thái", "Thời điểm nộp", "Bài làm", "Nhận xét AI", "Nhận xét GV", "Tệp / liên kết"], [38, 38, 26, 15, 10, 36, 16, 14, 30, 21, 52, 46, 46, 42]);
    reportSubmissions.forEach((submission: any) => {
      const student: any = studentById.get(String(submission.student_id)) || {};
      submissionSheet.addRow([formulaSafe(submission.id), formulaSafe(submission.student_id || ""), formulaSafe(student.full_name || submission.student_name), formulaSafe(classNameOf(student)), submission.activity_id, formulaSafe(activityTitle(submission.activity_id)), approvedScore(submission), aiScoreText(submission.ai_score), reviewStatus(submission), submission.submitted_at ? new Date(submission.submitted_at) : null, cellText(submission.answer_text || submission.answer || "", "Bài nộp cá nhân", submission.id, "Bài làm"), cellText(submission.ai_feedback || "", "Bài nộp cá nhân", submission.id, "Nhận xét AI"), cellText(submission.teacher_feedback || "", "Bài nộp cá nhân", submission.id, "Nhận xét giáo viên"), cellText(submission.file_url || "", "Bài nộp cá nhân", submission.id, "Tệp / liên kết")]);
    });
    styleDataRows(submissionSheet, [7, 8], [10]);

    const evidenceSheet = workbook.addWorksheet("Sổ tay hoạt động");
    styleSheet(evidenceSheet, "Hồ sơ hoạt động và thí nghiệm", "Nội dung evidence được giữ dưới dạng JSON để bảo toàn cấu trúc; điểm AI và điểm giáo viên nằm ở cột riêng.", ["Mã hồ sơ", "Mã học sinh", "Học sinh", "Lớp", "Mã bài", "Tên bài", "Hoàn thành lúc", "Điểm tự đánh giá", "Thang điểm", "Điểm AI", "Điểm giáo viên", "Trạng thái", "Nội dung / bằng chứng", "Nhận xét AI", "Nhận xét GV"], [38, 38, 26, 15, 10, 36, 21, 16, 13, 13, 16, 30, 54, 42, 42]);
    reportEvidence.forEach((record: any) => {
      const student: any = studentById.get(String(record.student_id)) || {};
      evidenceSheet.addRow([formulaSafe(record.id), formulaSafe(record.student_id), formulaSafe(student.full_name || "Hồ sơ đã xóa"), formulaSafe(classNameOf(student)), record.activity_id, formulaSafe(activityTitle(record.activity_id)), record.completed_at ? new Date(record.completed_at) : null, scoreText(record.score), scoreText(record.score_max), aiScoreText(record.ai_score), scoreText(record.teacher_score), reviewStatus(record, record.teacher_score), cellText(record.evidence, "Sổ tay hoạt động", record.id, "Nội dung / bằng chứng"), cellText(record.ai_feedback || "", "Sổ tay hoạt động", record.id, "Nhận xét AI"), cellText(record.teacher_feedback || "", "Sổ tay hoạt động", record.id, "Nhận xét giáo viên")]);
    });
    styleDataRows(evidenceSheet, [8, 9, 10, 11], [7]);

    const quizSheet = workbook.addWorksheet("Kết quả trắc nghiệm");
    styleSheet(quizSheet, "Kết quả trắc nghiệm", "Kết quả trắc nghiệm đã lưu; điểm là kết quả của bài quiz, không trộn vào điểm giáo viên ở báo cáo tổng quan.", ["Mã lượt làm", "Mã học sinh", "Học sinh", "Lớp", "Mã quiz", "Tên quiz", "Mã bài", "Tên bài", "Điểm quiz", "Thời điểm làm"], [38, 38, 26, 15, 12, 38, 10, 38, 14, 21]);
    reportQuizResults.forEach((record: any) => {
      const student: any = studentById.get(String(record.student_id)) || {};
      const quiz = Array.isArray(record.quizzes) ? record.quizzes[0] : record.quizzes;
      quizSheet.addRow([formulaSafe(record.id), formulaSafe(record.student_id), formulaSafe(student.full_name || "Hồ sơ đã xóa"), formulaSafe(classNameOf(student)), record.quiz_id, formulaSafe(quiz?.title || `Quiz ${record.quiz_id}`), quiz?.activity_id ?? null, quiz?.activity_id ? formulaSafe(activityTitle(quiz.activity_id)) : "Chưa gắn bài", scoreText(record.score), record.created_at ? new Date(record.created_at) : null]);
    });
    styleDataRows(quizSheet, [9], [10]);

    const groupSheet = workbook.addWorksheet("Bài tập nhóm");
    styleSheet(groupSheet, "Bài tập nhóm", "Danh sách nhiệm vụ nhóm, lớp nhận bài, số nhóm, bài nộp và ma trận chấm.", ["Mã bài nhóm", "Tên bài tập nhóm", "Lớp nhận bài", "Hạn nộp", "Số nhóm", "Số bài nộp", "Điểm GV TB", "Trạng thái", "Mô tả", "Rubric", "Tên tệp rubric", "Đường dẫn tệp rubric"], [38, 32, 20, 21, 12, 14, 14, 15, 48, 48, 30, 52]);
    reportGroupAssignments.forEach((assignment: any) => {
      const assignmentSubmissions = groupSubmissionsByAssignment.get(String(assignment.id)) || [];
      const assignmentScores = assignmentSubmissions.map((submission: any) => submission.final_score).map(scoreText).filter((score): score is number => score !== null);
      groupSheet.addRow([formulaSafe(assignment.id), formulaSafe(assignment.title), formulaSafe(assignment.class_name || "Tất cả lớp"), assignment.deadline ? new Date(assignment.deadline) : null, groupCounts.get(String(assignment.id)) || 0, assignmentSubmissions.length, assignmentScores.length ? assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length : null, assignmentSubmissions.length ? "Có bài nộp" : "Chưa nộp", cellText(assignment.description || "", "Bài tập nhóm", assignment.id, "Mô tả"), cellText(assignment.rubric || "", "Bài tập nhóm", assignment.id, "Rubric"), formulaSafe(assignment.rubric_document_name || ""), formulaSafe(assignment.rubric_document_path || "")]);
    });
    styleDataRows(groupSheet, [7], [4]);

    const groupsSheet = workbook.addWorksheet("Phân nhóm");
    styleSheet(groupsSheet, "Danh sách nhóm và thành viên", "Mỗi thành viên có một dòng; nhóm trống thành viên vẫn xuất hiện để giáo viên rà soát.", ["Mã bài nhóm", "Bài tập", "Mã nhóm", "Số nhóm", "Tên nhóm", "Mã học sinh", "Học sinh", "Lớp", "Số thành viên"], [38, 32, 38, 12, 28, 38, 28, 16, 14]);
    reportGroups.forEach((group: any) => {
      const assignment: any = groupAssignmentById.get(String(group.assignment_id));
      const members = Array.isArray(group.group_assignment_members) ? group.group_assignment_members : [];
      if (!members.length) groupsSheet.addRow([formulaSafe(group.assignment_id), formulaSafe(assignment?.title || "Bài tập đã xóa"), formulaSafe(group.id), group.group_number, formulaSafe(group.group_name || ""), "", "Chưa phân học sinh", "", 0]);
      members.forEach((member: any) => {
        const student = Array.isArray(member.students) ? member.students[0] : member.students;
        groupsSheet.addRow([formulaSafe(group.assignment_id), formulaSafe(assignment?.title || "Bài tập đã xóa"), formulaSafe(group.id), group.group_number, formulaSafe(group.group_name || ""), formulaSafe(member.student_id), formulaSafe(student?.full_name || "Hồ sơ đã xóa"), formulaSafe(classNameOf(student || {})), members.length]);
      });
    });
    styleDataRows(groupsSheet);

    const groupSubmissionSheet = workbook.addWorksheet("Bài nộp nhóm");
    styleSheet(groupSubmissionSheet, "Bài nộp nhóm và chấm điểm", "Điểm tổng kết chỉ dùng điểm giáo viên; điểm gợi ý AI được lưu riêng.", ["Mã bài nộp", "Mã nhiệm vụ", "Tên nhiệm vụ", "Mã nhóm", "Tên nhóm", "Điểm giáo viên", "Gợi ý AI", "Trạng thái", "Thời điểm nộp", "Bài làm", "Nhận xét AI", "Nhận xét GV", "Tệp / liên kết"], [38, 38, 32, 38, 28, 16, 14, 30, 21, 52, 44, 44, 42]);
    reportGroupSubmissions.forEach((submission: any) => {
      const group: any = groupsById.get(String(submission.group_id));
      const assignment: any = groupAssignmentById.get(String(submission.assignment_id));
      groupSubmissionSheet.addRow([formulaSafe(submission.id), formulaSafe(submission.assignment_id), formulaSafe(assignment?.title || "Bài tập đã xóa"), formulaSafe(submission.group_id || ""), formulaSafe(group?.group_name || submission.group_name || ""), approvedScore(submission), aiScoreText(submission.ai_score), reviewStatus(submission), submission.submitted_at ? new Date(submission.submitted_at) : null, cellText(submission.answer || "", "Bài nộp nhóm", submission.id, "Bài làm"), cellText(submission.ai_feedback || "", "Bài nộp nhóm", submission.id, "Nhận xét AI"), cellText(submission.teacher_feedback || "", "Bài nộp nhóm", submission.id, "Nhận xét giáo viên"), cellText(submission.file_url || "", "Bài nộp nhóm", submission.id, "Tệp / liên kết")]);
    });
    styleDataRows(groupSubmissionSheet, [6, 7], [9]);

    const groupProgressSheet = workbook.addWorksheet("Tiến độ nhóm theo HS");
    styleSheet(groupProgressSheet, "Tiến độ nhóm theo học sinh", "Mỗi bài nộp nhóm được gắn với từng thành viên qua group_id và student_id; không suy đoán người nộp từ tên.", ["Mã bài nộp", "Mã nhiệm vụ", "Tên nhiệm vụ", "Mã nhóm", "Tên nhóm", "Mã học sinh", "Học sinh", "Lớp", "Điểm giáo viên", "Gợi ý AI", "Trạng thái", "Thời điểm nộp", "Tệp / liên kết"], [38, 38, 32, 38, 28, 38, 28, 16, 16, 14, 30, 21, 42]);
    reportGroupSubmissions.forEach((submission: any) => {
      const group: any = groupsById.get(String(submission.group_id));
      const assignment: any = groupAssignmentById.get(String(submission.assignment_id));
      const members = Array.isArray(group?.group_assignment_members) ? group.group_assignment_members : [];
      if (members.length === 0) {
        groupProgressSheet.addRow([formulaSafe(submission.id), formulaSafe(submission.assignment_id), formulaSafe(assignment?.title || "Bài tập đã xóa"), formulaSafe(submission.group_id || ""), formulaSafe(group?.group_name || submission.group_name || ""), "", "Chưa gắn học sinh", "", approvedScore(submission), aiScoreText(submission.ai_score), reviewStatus(submission), submission.submitted_at ? new Date(submission.submitted_at) : null, cellText(submission.file_url || "", "Bài nộp nhóm", submission.id, "Tệp / liên kết")]);
      }
      members.forEach((member: any) => {
        const student: any = studentById.get(String(member.student_id)) || {};
        groupProgressSheet.addRow([formulaSafe(submission.id), formulaSafe(submission.assignment_id), formulaSafe(assignment?.title || "Bài tập đã xóa"), formulaSafe(submission.group_id || ""), formulaSafe(group?.group_name || submission.group_name || ""), formulaSafe(member.student_id), formulaSafe(student.full_name || "Hồ sơ đã xóa"), formulaSafe(classNameOf(student)), approvedScore(submission), aiScoreText(submission.ai_score), reviewStatus(submission), submission.submitted_at ? new Date(submission.submitted_at) : null, cellText(submission.file_url || "", "Bài nộp nhóm", submission.id, "Tệp / liên kết")]);
      });
    });
    styleDataRows(groupProgressSheet, [9, 10], [12]);

    summary.getCell("A17").value = "Phần nội dung dài";
    summary.getCell("B17").value = longContentChunks.length;
    summary.getCell("C17").value = longContentChunks.length ? "Nội dung vượt giới hạn ô Excel được tách nguyên văn trong sheet Nội dung dài." : "Không có ô nào vượt giới hạn hiển thị.";
    summary.getRow(17).eachCell((cell) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: "0F172A" } };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "CBD5E1" } } };
    });

    if (longContentChunks.length) {
      const longTextSheet = workbook.addWorksheet("Nội dung dài");
      styleSheet(longTextSheet, "Nội dung dài được tách nguyên văn", "Các phần ghép theo Mã bản ghi + Trường + Phần; thứ tự tăng dần để khôi phục nguyên văn.", ["Sheet nguồn", "Mã bản ghi", "Trường", "Phần", "Tổng phần", "Nội dung nguyên văn"], [24, 38, 26, 12, 14, 100]);
      longContentChunks.forEach((chunk) => longTextSheet.addRow([formulaSafe(chunk.source), formulaSafe(chunk.recordId), formulaSafe(chunk.field), chunk.part, chunk.total, formulaSafe(chunk.content)]));
      styleDataRows(longTextSheet);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const bytes = new Uint8Array(buffer as ArrayBufferLike);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bao-cao-lop-vatly11-${generatedAt.toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setReportExportSuccess(previewMode ? "Đã xuất báo cáo từ dữ liệu mẫu." : "Đã tải báo cáo Excel đầy đủ của lớp.");
    } catch (error) {
      setReportExportError(error instanceof Error ? error.message : "Không thể tạo báo cáo. Hãy thử lại sau.");
    } finally {
      setIsExportingReport(false);
    }
  };

  const currentSubmissions = selectedGradingAct ? submissions.filter(s => s.activity_id === selectedGradingAct.id) : [];
  const currentGroupSubs = expandedGroupAct ? groupSubmissions.filter(s => s.assignment_id === expandedGroupAct) : [];
  const newActivityChapters = curriculumChapters.filter((chapter) => chapter.course_id === newActCourseId);
  const currentRoster = showArchivedStudents ? archivedStudents : activeStudents;
  const studentClassOptions = getStudentClassNames(currentRoster);
  const visibleStudents = filterStudentRoster(currentRoster, studentClassFilter, searchTerm);
  const groupTargetCount = newGroupClassName === "__all__" ? activeStudents.length : newGroupClassName === "__choose__" ? 0 : filterStudentRoster(activeStudents, newGroupClassName, "").length;

  // Thống kê phổ điểm
  const gradedSubs = submissions.filter(s => s.ai_score !== null && s.ai_score !== -1);
  const excellentCount = gradedSubs.filter(s => s.ai_score >= 8).length;
  const goodCount = gradedSubs.filter(s => s.ai_score >= 6.5 && s.ai_score < 8).length;
  const avgCount = gradedSubs.filter(s => s.ai_score >= 5 && s.ai_score < 6.5).length;
  const weakCount = gradedSubs.filter(s => s.ai_score < 5).length;

  return (
    <main className="min-h-screen flex overflow-x-hidden bg-slate-50">
      {previewMode && <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-950 shadow-lg"><p>Đang xem dashboard tương tác với dữ liệu mẫu. Có thể mở tab, thu gọn, lọc và nhập thử; các thao tác ghi/AI sẽ không chạm dữ liệu thật.</p>{previewNotice && <p role="status" className="mt-2 border-t border-amber-200 pt-2 font-normal">{previewNotice}</p>}</div>}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <button type="button" aria-label={mobileNavOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"} aria-expanded={mobileNavOpen} aria-controls="teacher-navigation" onClick={() => setMobileNavOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100">
          {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs font-black tracking-wide text-slate-900">GIÁO VIÊN PORTAL</p>
          <p className="truncate text-[10px] text-slate-500">Lớp 11A1 · Điều hướng nhanh</p>
        </div>
      </div>
      {mobileNavOpen && <button type="button" aria-label="Đóng menu điều hướng" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" />}
      {/* SIDEBAR ĐỒNG BỘ MÀU SLATE-900 VÀ CÁC PHÂN HỆ RÕ RÀNG */}
      <aside id="teacher-navigation" className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 transform flex-col border-r border-slate-800 bg-slate-900 text-slate-300 shadow-2xl transition-transform duration-300 motion-reduce:transition-none ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} lg:sticky lg:top-0 lg:h-screen lg:z-20 lg:translate-x-0 lg:transition-none`}>
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
              onClick={() => navigateToTab('home')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'home' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Home className="w-4 h-4 text-blue-400" /> Trang chủ Bảng điều khiển
            </button>
            <button
              onClick={() => navigateToTab('analytics')}
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
                onClick={() => navigateToTab('activities')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'activities' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-400" /> Bài học cá nhân ({activities.length})
              </button>
              <button
                onClick={() => navigateToTab('curriculum')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'curriculum' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4 text-cyan-300" /> Lộ trình môn & chương
              </button>
              <button
                onClick={() => navigateToTab('resources')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'resources' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FolderOpen className="w-4 h-4 text-amber-300" /> Kho học liệu
              </button>
              <button
                onClick={() => navigateToTab('create_activity')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'create_activity' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Tạo bài tập mới
              </button>
              <button
                onClick={() => navigateToTab('group_assignments')}
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
                onClick={() => navigateToTab('grading')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'grading' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-400" /> Chấm điểm cá nhân
              </button>
              <button
                onClick={() => navigateToTab('activity-evidence')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'activity-evidence' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-cyan-400" /> Sổ tay & bằng chứng
              </button>
              <button
                onClick={() => navigateToTab('ocr')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'ocr' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Camera className="w-4 h-4 text-purple-400" /> Chấm từ ảnh (AI OCR)
              </button>
              <button
                onClick={() => navigateToTab('regrade')}
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
                onClick={() => navigateToTab('students')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'students' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" /> Danh sách sinh viên ({activeStudents.length})
              </button>
              <button
                onClick={() => navigateToTab('quizzes')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'quizzes' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-400" /> Tạo Trắc nghiệm & AI Sinh Đề
              </button>
              <button
                onClick={() => navigateToTab('chat')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'chat' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-blue-400" /> Kênh thảo luận ({messages.length})
              </button>
              <button
                onClick={() => navigateToTab('student_questions')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                  activeTab === 'student_questions' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-indigo-400" /> Góc hỏi đáp ({pendingQuestionCount})
              </button>
            </div>
          </div>
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-1 text-xs font-semibold">
          <Link href="/chapters" className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
            <ExternalLink className="w-4 h-4" /> Xem chương học công khai
          </Link>
          <Link href="/" className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
            <Home className="w-4 h-4" /> Về Trang chủ Website
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-rose-400 hover:text-white hover:bg-rose-600/40 rounded-xl transition-all">
            {previewMode ? <Home className="w-4 h-4" /> : <LogOut className="w-4 h-4" />} {previewMode ? "Về trang chủ" : "Đăng xuất"}
          </button>
        </div>
      </aside>

      {/* CONTENT AREA CHÍNH */}
      <div className="min-w-0 flex-1 p-4 pt-20 md:p-8 md:pt-20 lg:p-10 lg:pt-10 h-screen overflow-y-auto relative">
        {!previewMode && dataLoadIssues.length > 0 && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"><div><p className="font-bold">Chưa tải được đầy đủ dữ liệu lớp.</p><p className="mt-1 text-xs">Mục lỗi: {dataLoadIssues.join(", ")}. Danh sách trống lúc này có thể do kết nối hoặc quyền Supabase, không có nghĩa là dữ liệu đã bị xóa.</p></div><button type="button" onClick={() => void fetchData()} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold hover:bg-amber-100"><RefreshCw className="h-4 w-4" />Tải lại dữ liệu</button></div>}
        <Link href="/" className="absolute top-6 right-8 hidden bg-white text-slate-600 p-3 rounded-full shadow-md border hover:bg-slate-50 transition-all z-10 lg:inline-flex" title="Về trang chủ">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* 1. TAB TRANG CHỦ GIÁO VIÊN */}
        {activeTab === 'home' && (
          <TeacherHome previewMode={previewMode} onNavigateTab={navigateToTab} />
        )}

        {activeTab === 'resources' && <ResourceLibrary previewMode={previewMode} activities={activities} />}

        {activeTab === 'curriculum' && <CurriculumManager previewMode={previewMode} />}

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
                  onClick={() => navigateToTab('create_activity')}
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

            <CapacitanceLabSettings previewMode={previewMode} />
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
                          type="button"
                          onClick={() => {
                            if (expandedAct === act.id) {
                              setExpandedAct(null);
                              return;
                            }
                            setExpandedAct(act.id);
                            setEditRubricText(act.grading_rubric || "");
                            setEditRubricFile(null);
                            setEditRubricFileName(act.rubric_document_name || "");
                            setEditRubricImportError("");
                          }}
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
                          <RubricEditor
                            id={`edit-rubric-${act.id}`}
                            compact
                            value={editRubricText}
                            onChange={setEditRubricText}
                            onImportFile={(file) => void handleEditActivityRubricFile(file)}
                            fileName={editRubricFileName}
                            importError={editRubricImportError}
                            isImporting={isImportingEditRubric}
                            disabled={savingActivityId === act.id}
                            savedFileName={act.rubric_document_name}
                            onDownloadSavedFile={() => void downloadRubricDocument(act)}
                          />
                          {editRubricFile && !rubricDocumentSchemaReady && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Cần migration 20261031002700_rubric_document_import.sql để lưu file gốc ma trận.</p>}
                        </div>

                        <div className="flex flex-wrap gap-4 items-center pt-2">
                          <label className={`bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${uploadingDocumentActivityId === act.id ? "cursor-wait opacity-60" : "hover:bg-blue-100 cursor-pointer"}`} aria-disabled={uploadingDocumentActivityId === act.id}>
                            <Upload className="w-4 h-4"/> {uploadingDocumentActivityId === act.id ? "Đang tải và lưu…" : "Tải tệp tài liệu / Phiếu bài"}
                            <input type="file" className="hidden" disabled={uploadingDocumentActivityId === act.id} onChange={(e) => void handleUploadFile(e, act.id)} />
                          </label>
                          {act.document_url && (
                            <a href={privateFileHref(act.document_url)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-xs font-semibold flex items-center gap-1">
                              <ExternalLink className="w-3.5 h-3.5" /> Xem tệp tài liệu hiện tại
                            </a>
                          )}
                          <button type="submit" disabled={savingActivityId === act.id || isImportingEditRubric} className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2">
                            <Save className="w-4 h-4"/> {savingActivityId === act.id ? "Đang lưu…" : "Lưu thay đổi"}
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

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-cyan-950">Vị trí trong lộ trình</h3>
                    <p className="mt-1 text-xs leading-5 text-cyan-800">Gắn bài này vào môn và chương để học sinh thấy nó trong giao diện tổng thể. Có thể tạo thêm môn/chương ở mục “Lộ trình môn &amp; chương”.</p>
                  </div>
                  <button type="button" onClick={() => navigateToTab('curriculum')} className="shrink-0 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-100">Mở lộ trình</button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700">Môn học
                    <select value={newActCourseId} onChange={(event) => { setNewActCourseId(event.target.value); setNewActChapterId(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-cyan-500">
                      <option value="">Chưa gán môn học</option>
                      {curriculumCourses.map((course) => <option key={course.id} value={course.id}>{course.subject ? `${course.subject} · ` : ""}{course.title} {course.grade_level ? `(Khối ${course.grade_level})` : ""}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-700">Chương
                    <select value={newActChapterId} onChange={(event) => setNewActChapterId(event.target.value)} disabled={!newActCourseId} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-100">
                      <option value="">Chưa gán chương</option>
                      {newActivityChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="text-xs font-bold text-slate-700">Giai đoạn
                  <select value={newActPhase} onChange={(event) => setNewActPhase(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500"><option>Trước lớp</option><option>Trên lớp</option><option>Sau lớp</option></select>
                </label>
                <label className="text-xs font-bold text-slate-700">Loại hoạt động
                  <select value={newActType} onChange={(event) => setNewActType(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500"><option>Bài giảng</option><option>Bài tập</option><option>Thí nghiệm</option><option>Dự án</option><option>Phản tư</option></select>
                </label>
                <label className="text-xs font-bold text-slate-700">Thời lượng dự kiến
                  <input value={newActDuration} onChange={(event) => setNewActDuration(event.target.value)} maxLength={80} placeholder="Ví dụ: 20–25 phút" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-blue-500" />
                </label>
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

              <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                <RubricEditor
                  id="new-activity-rubric"
                  value={newActRubric}
                  onChange={setNewActRubric}
                  onImportFile={(file) => void handleNewActivityRubricFile(file)}
                  fileName={newActRubricFileName}
                  importError={newActRubricImportError}
                  isImporting={isImportingNewActRubric}
                  disabled={isCreatingAct}
                />
                {!rubricDocumentSchemaReady && !previewMode && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Đã trích nội dung được, nhưng cần migration 20261031002700_rubric_document_import.sql để hệ thống lưu kèm file gốc.</p>}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm font-semibold text-emerald-950">
                <input type="checkbox" checked={newActAcceptingSubmissions} onChange={(event) => setNewActAcceptingSubmissions(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Cho phép học sinh nộp bài ngay sau khi giáo viên tạo hoạt động
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigateToTab('activities')}
                  className="px-5 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAct || isImportingNewActRubric || Boolean(newActRubricFile && !rubricDocumentSchemaReady && !previewMode)}
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

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tên bài tập nhóm *</label>
                  <input value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} placeholder="VD: Thuyết trình ứng dụng Tụ điện trong thực tiễn..." className="w-full border p-2.5 rounded-xl text-sm outline-none bg-slate-50/50" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Hạn chót nộp bài</label>
                  <input type="datetime-local" value={newGroupDeadline} onChange={e => setNewGroupDeadline(e.target.value)} className="w-full border p-2.5 rounded-xl text-sm outline-none bg-slate-50/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Lớp nhận bài *</label>
                  <select required value={newGroupClassName} onChange={(event) => setNewGroupClassName(event.target.value)} className="w-full border p-2.5 rounded-xl text-sm outline-none bg-slate-50/50">
                    <option value="__choose__" disabled>Chọn lớp…</option>
                    <option value="__all__">Tất cả lớp</option>
                    {studentClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">Sẽ phân {groupTargetCount} học sinh vào nhóm.</p>
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
                  <div className="p-5 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-orange-600" /> {gAct.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {gAct.description || "Không có mô tả"} • Lớp: {gAct.class_name || "Tất cả lớp"} • Hạn: {gAct.deadline ? new Date(gAct.deadline).toLocaleString('vi-VN') : 'Không giới hạn'}
                      </p>
                      {gAct.document_url && (
                        <a href={gAct.document_url} target="_blank" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-blue-600 underline font-semibold mt-1">
                          <ExternalLink className="w-3.5 h-3.5" /> Xem tài liệu đề tài nhóm
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={savingGroupRubricId === gAct.id} onClick={(e) => { e.stopPropagation(); deleteGroupAssignment(gAct.id); }} className="text-slate-400 hover:text-rose-600 p-2 disabled:opacity-40" title="Xóa bài nhóm">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                      <button type="button" aria-expanded={expandedGroupAct === gAct.id} aria-controls={`group-details-${gAct.id}`} onClick={() => toggleExpandGroupAct(gAct.id)} className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-xl text-xs font-bold">
                        {expandedGroupAct === gAct.id ? "Thu gọn" : "Chi tiết & Chấm điểm"}
                      </button>
                    </div>
                  </div>

                  {expandedGroupAct === gAct.id && (
                    <div id={`group-details-${gAct.id}`} className="border-t border-slate-100 p-6 space-y-6">
                      <div>
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-orange-600"/> Danh sách thành viên từng nhóm
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 mb-4 bg-slate-50 p-4 rounded-2xl border">
                          <button type="button" disabled={regroupingAssignmentId !== null} onClick={() => void createGroupsForAssignment(gAct.id, false)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm disabled:cursor-wait disabled:opacity-60">
                            {regroupingAssignmentId === gAct.id ? "Đang chia nhóm…" : "Phân nhóm theo danh sách"}
                          </button>
                          <button type="button" disabled={regroupingAssignmentId !== null} onClick={() => void createGroupsForAssignment(gAct.id, true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:cursor-wait disabled:opacity-60">
                            <Shuffle className="w-4 h-4"/> Chia nhóm ngẫu nhiên
                          </button>
                        </div>
                        {groupDetailsError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900"><span>Không tải được danh sách nhóm: {groupDetailsError}</span><button type="button" onClick={() => void fetchGroupDetails(gAct.id)} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-bold hover:bg-rose-100">Tải lại</button></div>}
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
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-orange-200 bg-white px-3 py-2 text-[11px] font-bold text-orange-800 hover:bg-orange-50">
                              <Upload className="h-3.5 w-3.5" />
                              {isImportingGroupRubric ? "Đang đọc file…" : "Nhập tài liệu ma trận"}
                              <input type="file" accept=".txt,.md,.csv,.docx,.xlsx,.pdf,.png,.jpg,.jpeg,.webp" disabled={isImportingGroupRubric || savingGroupRubricId !== null || loadingGroupDetailsId === gAct.id} onChange={(event) => void handleGroupRubricFileUpload(event, gAct.id)} className="hidden" />
                            </label>
                            {gAct.rubric_document_path && <button type="button" onClick={() => void downloadGroupRubricDocument(gAct)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"><Download className="h-3.5 w-3.5" /> Tải file gốc</button>}
                            {groupRubricFileName && <span className="min-w-0 truncate text-[11px] text-slate-600">{isImportingGroupRubric ? "Đang trích xuất: " : "Ma trận từ file: "}{groupRubricFileName}</span>}
                          </div>
                          {loadingGroupDetailsId === gAct.id && <p role="status" className="mb-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-900">Đang tải danh sách nhóm và ma trận đã lưu…</p>}
                          {groupRubricFile && !groupRubricDocumentSchemaReady && <p role="status" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">File gốc sẽ được lưu sau khi áp dụng migration 20261101000100_group_rubric_documents.sql.</p>}
                          {groupRubricImportError && <p role="alert" className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">{groupRubricImportError}</p>}
                          <div className="flex gap-2">
                            <textarea
                              value={groupRubricText}
                              maxLength={20000}
                              disabled={isImportingGroupRubric || savingGroupRubricId !== null || loadingGroupDetailsId === gAct.id || groupRubricAssignmentId !== gAct.id}
                              onChange={e => setGroupRubricText(e.target.value)}
                              className="min-h-28 flex-1 resize-y rounded-xl border bg-slate-50/50 p-3 text-xs leading-5 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                              placeholder="Nội dung được trích từ file sẽ hiện ở đây để cô rà lại trước khi lưu. Có thể chỉnh sửa nếu cần."
                            />
                            <button type="button" disabled={savingGroupRubricId !== null || isImportingGroupRubric || loadingGroupDetailsId === gAct.id || groupRubricAssignmentId !== gAct.id} onClick={() => void saveGroupRubric(gAct.id)} className="self-start rounded-xl bg-slate-800 px-4 py-3 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50">
                              {savingGroupRubricId === gAct.id ? "Đang lưu…" : "Lưu ma trận"}
                            </button>
                          </div>
                          <p className="mt-2 text-[10px] leading-4 text-slate-500">Hỗ trợ TXT, Markdown, CSV, Word (.docx), Excel (.xlsx), PDF có lớp chữ hoặc scan và ảnh PNG/JPG/WebP (OCR). Nội dung trích được giữ để cô rà soát; file gốc được lưu riêng và nhóm được giao có thể tải xuống.</p>
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
                                <input type="number" min="0" max="10" step="0.1" placeholder="Điểm cô" className="border p-2 rounded-xl w-20 text-xs bg-white" id={`gscore-${sub.id}`} defaultValue={sub.final_score ?? sub.ai_score ?? ""} />
                                <input type="text" placeholder="Góp ý của cô cho nhóm..." className="border p-2 rounded-xl flex-1 text-xs bg-white" id={`gfb-${sub.id}`} defaultValue={sub.teacher_feedback || ""} />
                                <button
                                  onClick={() => void saveTeacherGroupGrade(sub.id, `gscore-${sub.id}`, `gfb-${sub.id}`)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl"
                                  title="Lưu điểm giáo viên"
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
                    onClick={() => { setSelectedGradingAct(act); setRubricText(act.grading_rubric || ""); setRubricFile(null); setRubricFileName(""); setRubricImportError(""); }}
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
                    <div className="flex flex-col items-end gap-1.5">
                      <button type="button" disabled={isExportingReport} onClick={() => void exportExcelReport()} className="bg-emerald-600 hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        <Download className="w-3.5 h-3.5" /> {isExportingReport ? "Đang tạo báo cáo…" : "Xuất báo cáo Excel"}
                      </button>
                      {reportExportError && <p role="alert" className="max-w-md text-right text-[11px] font-semibold text-rose-700">{reportExportError}</p>}
                      {reportExportSuccess && <p role="status" className="text-right text-[11px] font-semibold text-emerald-700">{reportExportSuccess}</p>}
                    </div>
                  </div>

                  <div className="space-y-3 border-b bg-blue-50/40 p-4">
                    <RubricEditor
                      id={`grading-rubric-${selectedGradingAct.id}`}
                      value={rubricText}
                      onChange={setRubricText}
                      onImportFile={(file) => void handleRubricFileUpload(file)}
                      fileName={rubricFile ? rubricFileName : ""}
                      importError={rubricImportError}
                      isImporting={isImportingRubric}
                      disabled={isSavingRubric}
                      savedFileName={selectedGradingAct.rubric_document_name}
                      onDownloadSavedFile={() => void downloadRubricDocument(selectedGradingAct)}
                    />
                    {!rubricDocumentSchemaReady && rubricFile && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Cần migration 20261031002700_rubric_document_import.sql để lưu file gốc ma trận.</p>}
                    <div className="flex justify-end">
                      <button type="button" disabled={isSavingRubric || isImportingRubric} onClick={() => void saveRubric()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-black disabled:cursor-wait disabled:opacity-50">
                        <Save className="h-4 w-4" /> {isSavingRubric ? "Đang lưu ma trận…" : "Lưu ma trận và file gốc"}
                      </button>
                    </div>
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
                          <input type="number" min="0" max="10" step="0.1" placeholder="Điểm cô" className="border p-2 rounded-xl w-20 text-xs bg-slate-50" id={`score-${sub.id}`} defaultValue={sub.final_score ?? sub.ai_score ?? ""} />
                          <input type="text" placeholder="Nhận xét của cô..." className="border p-2 rounded-xl flex-1 text-xs bg-slate-50" id={`fb-${sub.id}`} defaultValue={sub.teacher_feedback || ""} />
                          <button
                            onClick={() => void saveTeacherGrade(sub.id, `score-${sub.id}`, `fb-${sub.id}`)}
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
                      <input type="number" min="0" max="10" step="0.1" placeholder="Điểm cô" className="border p-2 rounded-xl w-20 text-xs bg-slate-50" id={`rescore-${sub.id}`} defaultValue={sub.final_score ?? sub.ai_score ?? ""} />
                      <input type="text" placeholder="Nhận xét của cô..." className="border p-2 rounded-xl flex-1 text-xs bg-slate-50" id={`refb-${sub.id}`} defaultValue={sub.teacher_feedback || ""} />
                      <button
                        onClick={() => void saveTeacherGrade(sub.id, `rescore-${sub.id}`, `refb-${sub.id}`)}
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

        {activeTab === 'activity-evidence' && <ActivityEvidencePanel previewMode={previewMode} />}

        {/* 9. TAB SINH VIÊN */}
        {activeTab === 'students' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900">Danh sách Học sinh ({activeStudents.length})</h2>
                <p className="text-slate-500 text-sm mt-1">Quản lý tài khoản học sinh, thêm từng em hoặc nhập hàng loạt từ Excel.</p>
              </div>
              <button
                type="button"
                onClick={() => exportStudentAccountsExcel(activeStudents)}
                disabled={activeStudents.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
              >
                <FileSpreadsheet className="h-4 w-4" /> Xuất Excel tài khoản
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4 shadow-sm"><label className="min-w-[220px] flex-1 text-xs font-bold text-slate-700">Lớp áp dụng cho học sinh mới<input value={studentClassName} onChange={(event) => setStudentClassName(event.target.value)} maxLength={40} required className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" placeholder="Ví dụ: 11A1" /></label><p className="max-w-xl text-xs leading-5 text-slate-500">Lớp này áp dụng khi thêm từng học sinh hoặc nhập danh sách; hồ sơ hiện có không bị đổi.</p></div>
            {!previewMode && !canProvisionStudentAccounts && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{studentAccountSchemaMissing ? "Cần áp dụng migration 20261103000100_student_username_auth.sql trên Supabase trước khi cấp tài khoản. Danh sách học sinh cũ vẫn dùng được." : "Chưa đọc được trạng thái tài khoản học sinh. Hãy kiểm tra kết nối/quyền Supabase rồi tải lại trang."}</p>}

            {!previewMode && studentArchiveSchemaMissing && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Cần áp dụng migration 20261103000200_student_archive.sql để lưu trữ an toàn mà không xóa lịch sử.</p>}
            <div className="grid md:grid-cols-2 gap-4">
              <form onSubmit={addStudentManual} className="bg-white p-5 rounded-2xl border shadow-sm flex gap-2">
                <input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} maxLength={120} placeholder="Nhập họ và tên học sinh mới..." className="flex-1 border p-2.5 rounded-xl text-sm outline-none bg-slate-50/50" required /><input type="date" aria-label="Ngày sinh học sinh" value={newStudentBirthDate} onChange={(event) => setNewStudentBirthDate(event.target.value)} className="w-36 border p-2.5 rounded-xl text-xs" />
                <button type="submit" disabled={isAddingStudent || (!previewMode && !canProvisionStudentAccounts)} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-xs font-bold">{isAddingStudent ? "Đang lưu…" : "Thêm ngay"}</button>
              </form>
              <div className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-center gap-3">
                <span className="text-xs font-bold text-slate-600">Nhập danh sách học sinh</span>
                <div className="flex flex-wrap items-center gap-3">
                  <input type="file" accept=".xlsx,.csv,.txt" onChange={handleExcelUpload} aria-label="Chọn Excel, CSV hoặc TXT chứa danh sách học sinh" className="min-w-0 flex-1 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 file:font-semibold" />
                  <button type="button" onClick={() => setShowPasteModal(true)} className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">Dán danh sách</button>
                </div>
                <p className="text-[11px] text-slate-500">Lớp áp dụng: <strong>{studentClassName || "chưa nhập"}</strong>. Excel/CSV: tên mỗi dòng hoặc cột “Họ và tên”. TXT: một họ tên mỗi dòng. Tạo tài khoản tự động, tối đa 500 dòng mỗi lượt; mật khẩu chỉ hiện một lần.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowArchivedStudents(false)} aria-pressed={!showArchivedStudents} className={"rounded-xl px-3 py-2 text-xs font-bold " + (!showArchivedStudents ? "bg-blue-700 text-white" : "border bg-white text-slate-600")}>Đang hoạt động ({activeStudents.length})</button>
                <button type="button" onClick={() => setShowArchivedStudents(true)} aria-pressed={showArchivedStudents} className={"rounded-xl px-3 py-2 text-xs font-bold " + (showArchivedStudents ? "bg-slate-700 text-white" : "border bg-white text-slate-600")}>Đã lưu trữ ({archivedStudents.length})</button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm tên học sinh..." className="w-full pl-11 pr-4 py-3 border rounded-xl bg-slate-50/50 outline-none text-sm" />
                </div>
                <label className="text-xs font-semibold text-slate-600">Lọc lớp<select value={studentClassFilter} onChange={(event) => setStudentClassFilter(event.target.value)} className="mt-1 block min-w-40 rounded-xl border bg-white px-3 py-3 text-sm"><option value="">Tất cả lớp ({currentRoster.length})</option>{studentClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}</select></label>
              </div>
              <p className="text-xs text-slate-500">Đang hiển thị {visibleStudents.length} / {currentRoster.length} hồ sơ{showArchivedStudents ? " đã lưu trữ" : " đang hoạt động"}. Hồ sơ trùng tên vẫn giữ mã học sinh riêng.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {visibleStudents.map((s: any) => (
                  <div key={s.id} className="min-w-0 rounded-xl border bg-slate-50 px-3 py-2.5 text-xs group">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-bold">{s.full_name}<span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">{s.class_name || "Chưa xếp lớp"}</span></span>
                      <div className="flex shrink-0 items-center gap-1">
                        {s.is_active === false ? <span className="rounded-md bg-slate-200 px-1.5 py-1 text-[9px] font-bold text-slate-600">Đã lưu trữ</span> : s.password_changed ? <span title="Học sinh đã tự đổi mật khẩu; giáo viên không xem được mật khẩu." className="rounded-md bg-emerald-100 px-1.5 py-1 text-[9px] font-bold text-emerald-700">Đã đổi mật khẩu</span> : s.auth_user_id ? <button type="button" disabled={previewMode || !canProvisionStudentAccounts} onClick={() => openStudentAccountModal(s)} className="rounded-md border border-amber-200 bg-white px-1.5 py-1 text-[9px] font-bold text-amber-800 disabled:opacity-50">Cấp lại mật khẩu</button> : <button type="button" disabled={previewMode || !canProvisionStudentAccounts} title={!canProvisionStudentAccounts ? "Cần áp dụng migration tài khoản mới." : undefined} onClick={() => openStudentAccountModal(s)} className="rounded-md border border-blue-200 bg-white px-1.5 py-1 text-[9px] font-bold text-blue-700 disabled:opacity-50">Cấp tài khoản</button>}
                        <button type="button" aria-label={(s.is_active === false ? "Khôi phục học sinh " : "Lưu trữ học sinh ") + s.full_name} title={s.is_active === false ? "Khôi phục hồ sơ" : "Lưu trữ, giữ nguyên lịch sử"} disabled={studentArchiveBusyId === s.id || studentArchiveSchemaMissing && !previewMode} onClick={() => void deleteStudent(s.id)} className={"rounded-md p-1 disabled:opacity-40 " + (s.is_active === false ? "text-blue-600 hover:bg-blue-50" : "text-slate-400 hover:text-amber-700")}>{studentArchiveBusyId === s.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : s.is_active === false ? <RotateCcw className="h-3.5 w-3.5"/> : <Archive className="h-3.5 w-3.5"/>}</button>
                      </div>
                    </div>
                    <p className="mt-1 truncate text-[10px] font-normal text-slate-500">{s.student_code ? `Mã SV: ${s.student_code} · ` : ""}{s.username ? `Đăng nhập: ${s.username}` : (s.login_email || (s.auth_user_id ? "Tài khoản đã liên kết" : "Chưa có tài khoản đăng nhập"))}</p>
                    <button type="button" onClick={() => setDetailStudent(s)} className="mt-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100">Xem chi tiết bài làm</button>
                  </div>
                ))}
                {visibleStudents.length === 0 && (
                  <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">{currentRoster.length ? "Không tìm thấy học sinh phù hợp trong lớp này." : showArchivedStudents ? "Chưa có hồ sơ học sinh được lưu trữ." : "Chưa có học sinh. Thêm tên hoặc nhập danh sách để bắt đầu."}</p>
                )}
              </div>
            </div>
            {detailStudent && (() => {
              const studentEvidence = activityEvidence.filter((row) => row.student_id === detailStudent.id);
              const studentSubs = submissions.filter((row) => row.student_id === detailStudent.id);
              const studentQuiz = quizSubmissions.filter((row) => row.student_id === detailStudent.id);
              const totalActivities = activities.length || 11;
              const doneActivities = new Set(studentEvidence.filter((row) => row.completed_at).map((row) => row.activity_id)).size;
              const avgTeacherScore = (() => {
                const values = studentEvidence.map((row) => Number(row.teacher_score)).filter((value) => Number.isFinite(value));
                return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
              })();
              return <div className="fixed inset-0 z-[88] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailStudent(null); }}>
                <section role="dialog" aria-modal="true" className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div><h3 className="text-xl font-black text-slate-900">{detailStudent.full_name}</h3><p className="mt-1 text-sm text-slate-500">{detailStudent.class_name || "Chưa xếp lớp"}{detailStudent.student_code ? ` · Mã SV: ${detailStudent.student_code}` : ""}</p></div>
                    <button type="button" aria-label="Đóng" onClick={() => setDetailStudent(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-2xl font-black text-blue-700">{doneActivities}/{totalActivities}</p><p className="text-[11px] text-slate-500">Hoạt động đã hoàn thành</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-2xl font-black text-emerald-700">{avgTeacherScore === null ? "—" : avgTeacherScore.toFixed(2)}</p><p className="text-[11px] text-slate-500">Điểm GV trung bình</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-2xl font-black text-amber-700">{studentSubs.length}</p><p className="text-[11px] text-slate-500">Bài nộp cá nhân</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-2xl font-black text-indigo-700">{studentQuiz.length}</p><p className="text-[11px] text-slate-500">Lượt trắc nghiệm</p></div>
                  </div>
                  <h4 className="mt-5 font-bold text-slate-900">Hoạt động học tập</h4>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-2 py-2 font-bold">Hoạt động</th><th className="px-2 py-2 font-bold">Trạng thái</th><th className="px-2 py-2 font-bold">Điểm</th></tr></thead><tbody>
                    {activities.map((activity) => {
                      const evidence = studentEvidence.find((row) => row.activity_id === activity.id);
                      const submitted = Boolean(evidence?.completed_at);
                      const score = evidence?.teacher_score ?? evidence?.score;
                      return <tr key={activity.id} className="border-t border-slate-100"><td className="px-2 py-2">{activity.title}</td><td className="px-2 py-2">{submitted ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">Đã làm</span> : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">Chưa làm</span>}</td><td className="px-2 py-2 font-bold">{score === null || score === undefined ? "—" : Number(score).toFixed(2)}</td></tr>;
                    })}
                  </tbody></table></div>
                  <div className="mt-5 flex justify-end"><button type="button" onClick={() => setDetailStudent(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Đóng</button></div>
                </section>
              </div>;
            })}
            {accountStudent && (
              <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeStudentAccountModal(); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="student-account-title" className="student-credentials-print w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4"><div><h3 id="student-account-title" className="text-xl font-black text-slate-900">Thông tin đăng nhập học sinh</h3><p className="mt-1 text-sm text-slate-500">{accountStudent.full_name} · mật khẩu được tạo ngẫu nhiên và không lưu trong cơ sở dữ liệu.</p></div><button type="button" aria-label="Đóng" onClick={closeStudentAccountModal} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
                  {studentAccountError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{studentAccountError}</p>}
                  {studentAccountCredentials ? <div className="mt-5 space-y-3"><p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Hãy lưu lại ngay. Mật khẩu chỉ hiển thị trong lần này; học sinh phải đổi mật khẩu khi đăng nhập lần đầu.</p><div className="max-h-80 overflow-auto rounded-xl border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="px-2 py-2 font-bold">STT</th><th className="px-2 py-2 font-bold">Họ và tên</th><th className="px-2 py-2 font-bold">Tên đăng nhập</th><th className="px-2 py-2 font-bold">Mật khẩu tạm</th><th className="student-credentials-no-print px-2 py-2 font-bold">Sao chép</th></tr></thead><tbody>{studentAccountCredentials.map((credential, index) => { const copyRow = () => { void navigator.clipboard.writeText(`${credential.studentName}\t${credential.username}\t${credential.password}`).then(() => setStudentAccountNotice(`Đã sao chép thông tin của ${credential.studentName}.`)).catch(() => setStudentAccountNotice("Không sao chép tự động được; hãy chép thông tin đang hiển thị.")); }; return (<tr key={`${credential.username}-${index}`} className="border-t border-slate-100"><td className="px-2 py-2 text-slate-500">{index + 1}</td><td className="px-2 py-2 font-semibold text-slate-900">{credential.studentName}</td><td className="px-2 py-2 font-mono">{credential.username}</td><td className="px-2 py-2 font-mono font-bold break-all">{credential.password}</td><td className="student-credentials-no-print px-2 py-2"><button type="button" onClick={copyRow} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100">Sao chép</button></td></tr>); })}</tbody></table></div><div className="student-credentials-no-print flex flex-wrap gap-2"><button type="button" onClick={() => void navigator.clipboard.writeText(studentAccountCredentials.map((item) => `${item.studentName}\t${item.username}\t${item.password}`).join("\n")).then(() => setStudentAccountNotice("Đã sao chép toàn bộ thông tin đăng nhập.")).catch(() => setStudentAccountNotice("Không sao chép tự động được; hãy chép thông tin đang hiển thị."))} className="flex-1 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white">Sao chép danh sách</button><button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">In / lưu PDF</button></div><p role="status" className="text-xs text-slate-500">{studentAccountNotice}</p></div> : <form onSubmit={createStudentAccount} className="mt-5 space-y-4"><p className="text-sm leading-6 text-slate-600">Tạo mới hoặc cấp lại mật khẩu tạm cho hồ sơ. Khi cấp lại, mật khẩu cũ không còn dùng được và học sinh cần đổi mật khẩu sau khi đăng nhập.</p><div className="flex justify-end gap-2"><button type="button" onClick={closeStudentAccountModal} disabled={isCreatingStudentAccount} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Hủy</button><button type="submit" disabled={isCreatingStudentAccount || previewMode || !canProvisionStudentAccounts} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isCreatingStudentAccount ? "Đang tạo…" : accountStudent.auth_user_id ? "Cấp lại mật khẩu" : "Tạo tài khoản"}</button></div></form>}
                </section>
              </div>
            )}            {showPasteModal && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPasteModal(false); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="paste-students-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div><h3 id="paste-students-title" className="text-xl font-black text-slate-900">Dán danh sách học sinh</h3><p className="mt-1 text-sm text-slate-500">Mỗi dòng một họ tên. Danh sách sẽ được chuẩn hóa và xem lại trước khi lưu.</p></div>
                    <button type="button" aria-label="Đóng" onClick={() => setShowPasteModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                  </div>
                  <textarea value={pasteNamesText} onChange={(event) => setPasteNamesText(event.target.value)} autoFocus rows={9} placeholder={'Nguyễn Văn An\nTrần Thị Bình\nLê Minh Châu'} className="mt-5 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowPasteModal(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-600">Hủy</button><button type="button" onClick={handleProcessPastedText} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">Xem danh sách</button></div>
                </section>
              </div>
            )}
            {showImportModal && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" role="presentation">
                <section role="dialog" aria-modal="true" aria-labelledby="import-students-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4"><div><h3 id="import-students-title" className="text-xl font-black text-slate-900">Kiểm tra danh sách trước khi lưu</h3><p className="mt-1 text-sm text-slate-500">Tìm thấy {importPreviewNames.length} tên học sinh. Lớp đích: {studentClassName || "chưa nhập"}. Tên lặp trong tệp đã được gộp.{importPreviewNames.length > 500 ? " Mỗi lượt tối đa 500 học sinh; hãy chia danh sách nhỏ hơn." : ""}</p></div><button type="button" aria-label="Đóng" onClick={() => { setShowImportModal(false); setImportPreviewNames([]); setImportPreviewCodes([]); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
                  <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200"><ol className="divide-y divide-slate-100">{importPreviewNames.map((name, index) => <li key={`${name}-${index}`} className="flex items-center gap-3 px-4 py-2.5 text-sm"><span className="w-8 text-right text-xs text-slate-400">{index + 1}.</span><span className="font-medium text-slate-800">{name}</span></li>)}</ol></div>
                  <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setShowImportModal(false); setImportPreviewNames([]); setImportPreviewCodes([]); }} disabled={isSavingStudents} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Hủy</button><button type="button" onClick={confirmSaveImportedStudents} disabled={isSavingStudents || importPreviewNames.length === 0 || importPreviewNames.length > 500} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{isSavingStudents ? "Đang lưu…" : `Lưu ${importPreviewNames.length} học sinh`}</button></div>
                </section>
              </div>
            )}
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

            {/* Mục 7: Bảng thống kê từng bài trắc nghiệm */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">Thống kê bài trắc nghiệm</h3>
                <span className="text-xs text-slate-500">{quizzes.length} bài · {quizSubmissions.length} lượt làm</span>
              </div>
              {quizzes.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed p-4 text-center text-sm text-slate-500">Chưa có bài trắc nghiệm nào. Hãy tạo bài ở phần dưới.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600"><tr>
                      <th className="px-3 py-2 font-bold">Bài trắc nghiệm</th>
                      <th className="px-3 py-2 font-bold">Thời gian</th>
                      <th className="px-3 py-2 font-bold">Đã làm</th>
                      <th className="px-3 py-2 font-bold">Điểm TB</th>
                      <th className="px-3 py-2 font-bold">Thời gian làm TB</th>
                      <th className="px-3 py-2 font-bold">Chi tiết</th>
                    </tr></thead>
                    <tbody>
                      {quizzes.map((quiz: any) => {
                        const attempts = quizSubmissions.filter((row: any) => row.quiz_id === quiz.id);
                        const scores = attempts.map((row: any) => Number(row.score)).filter((score) => Number.isFinite(score));
                        const avgScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
                        const times = attempts.map((row: any) => Number(row.time_spent_seconds)).filter((value) => Number.isFinite(value));
                        const avgTime = times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : null;
                        return (
                          <tr key={quiz.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-semibold text-slate-800">{quiz.title || `Bài ${quiz.id}`}</td>
                            <td className="px-3 py-2">{quiz.time_limit ? `${quiz.time_limit} phút` : "—"}</td>
                            <td className="px-3 py-2">{attempts.length} em</td>
                            <td className="px-3 py-2 font-bold text-emerald-700">{avgScore === null ? "Chưa có" : avgScore.toFixed(2)}</td>
                            <td className="px-3 py-2">{avgTime === null ? "Chưa có" : `${Math.floor(avgTime / 60)} phút ${avgTime % 60} giây`}</td>
                            <td className="px-3 py-2"><details className="inline-block"><summary className="cursor-pointer font-bold text-blue-700">Xem {attempts.length} em</summary>
                              <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                                {attempts.length === 0 ? <p className="text-slate-400">Chưa có ai làm.</p> : attempts.map((row: any) => (
                                  <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1">
                                    <span>{row.students?.full_name || "Học sinh"}{row.students?.class_name ? <span className="text-slate-400"> · {row.students.class_name}</span> : null}</span>
                                    <span className="font-bold text-slate-700">{Number(row.score).toFixed(2)} đ · {Number(row.time_spent_seconds) || "—"}s</span>
                                  </div>
                                ))}
                              </div>
                            </details></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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

        {/* 11. TAB GÓC HỎI ĐÁP (CÂU HỎI HỌC SINH) */}
        {activeTab === 'student_questions' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-7 h-7 text-indigo-600" /> Góc hỏi đáp · Câu hỏi của học sinh
                </h1>
                <p className="text-xs text-slate-500 mt-1">Đọc câu hỏi, gửi phản hồi và cập nhật trạng thái xử lý. Học sinh thấy phản hồi ngay trong mục “Câu hỏi của tôi”.</p>
              </div>
              <button onClick={() => void loadStudentQuestions()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                <RefreshCw className={`w-4 h-4 ${questionLoading ? "animate-spin" : ""}`} /> Tải lại
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[{ id: "all", label: `Tất cả (${studentQuestions.length})` }].concat(
                QUESTION_STATUS_IDS.map((id: string) => ({ id, label: `${questionStatusLabel(id)} (${studentQuestions.filter((q) => q.status === id).length})` })),
              ).map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setQuestionFilter(chip.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                    questionFilter === chip.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >{chip.label}</button>
              ))}
            </div>

            <div className="space-y-4">
              {questionLoading && studentQuestions.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Đang tải câu hỏi…</p>
              ) : (questionFilter === "all" ? studentQuestions : studentQuestions.filter((q) => q.status === questionFilter)).length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Chưa có câu hỏi nào trong mục này. Dữ liệu sẽ được cập nhật sau khi học sinh gửi câu hỏi.</p>
              ) : (
                (questionFilter === "all" ? studentQuestions : studentQuestions.filter((q) => q.status === questionFilter)).map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    saving={questionSaving === q.id}
                    topicLabel={questionTopicLabel(q.topic)}
                    onRespond={(response, status) => void respondToQuestion(q.id, response, status)}
                    onSuggest={(questionId) => suggestQuestionAnswer(questionId)}
                  />
                ))
              )}
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    if (previewMode) {
                      const nextMuted = !isChatMuted;
                      setIsChatMuted(nextMuted);
                      setPreviewNotice(nextMuted ? "Đã khóa kênh chat mẫu trong phiên này." : "Đã mở khóa kênh chat mẫu trong phiên này.");
                      return;
                    }
                    await supabase.from('chat_settings').update({ is_muted: !isChatMuted }).eq('id', 1);
                    fetchData();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white ${isChatMuted ? 'bg-emerald-600' : 'bg-amber-600'}`}
                >
                  {isChatMuted ? "Mở khóa chat" : "Khóa chat học sinh"}
                </button>
                <button
                  onClick={async () => {
                    if (previewMode) {
                      setIsDeletionBlocked(!isDeletionBlocked);
                      setPreviewNotice(!isDeletionBlocked ? "Đã cấm xóa tin nhắn (chế độ mẫu)." : "Đã cho phép xóa tin nhắn (chế độ mẫu).");
                      return;
                    }
                    const nextBlocked = !isDeletionBlocked;
                    const { error } = await supabase.from('chat_settings').update({ deletion_blocked: nextBlocked }).eq('id', 1);
                    if (error) { setPreviewNotice("Không đổi được chế độ cấm xóa. Hãy áp dụng migration 20261104000600."); return; }
                    setIsDeletionBlocked(nextBlocked);
                    setPreviewNotice(nextBlocked ? "Đã CẤM học sinh xóa tin nhắn trong kênh thảo luận." : "Đã cho phép học sinh xóa tin nhắn của mình.");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white ${isDeletionBlocked ? 'bg-rose-600' : 'bg-slate-600'}`}
                >
                  {isDeletionBlocked ? "Đang cấm xóa chat" : "Cấm xóa chat"}
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
                      {m.attachment_url && (isInlineChatImage(m.attachment_type) ? <a href={privateFileHref(m.attachment_url)} target="_blank" rel="noreferrer"><Image unoptimized width={800} height={600} src={privateFileHref(m.attachment_url)} alt={m.attachment_name || "Tệp ảnh"} className="mt-2 max-h-64 rounded-xl object-contain" /></a> : <a href={privateFileHref(m.attachment_url)} target="_blank" rel="noreferrer" className="mt-2 block underline">📎 {m.attachment_name || "Tải tệp đính kèm"}</a>)}<button onClick={() => deleteMessage(m)} className="mt-2 block text-[10px] opacity-70 hover:opacity-100">Xóa tin nhắn</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
              <input type="file" accept={CHAT_ATTACHMENT_ACCEPT} onChange={(e) => setChatFile(e.target.files?.[0] || null)} className="max-w-32 text-[10px]" aria-label="Đính kèm tệp hoặc ảnh" /><input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập tin nhắn hướng dẫn học sinh..." className="flex-1 border p-3 rounded-xl text-xs outline-none bg-slate-50/50" /><button type="button" onClick={() => setChatFile(null)} className="text-xs">{chatFile?.name || ""}</button>
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
