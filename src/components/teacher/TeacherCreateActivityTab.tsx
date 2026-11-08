"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import RubricEditor from "@/components/RubricEditor";
import { extractRubricFile } from "@/lib/rubric-import.mjs";

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

type CreateActivityTabProps = {
  previewMode: boolean;
  activities?: any[];
  onCreated: () => void;
  onNavigateTab: (tab: string) => void;
};

export default function TeacherCreateActivityTab({
  previewMode,
  onCreated,
  onNavigateTab,
}: CreateActivityTabProps) {
  const [newActTitle, setNewActTitle] = useState("");
  const [newActDesc, setNewActDesc] = useState("");
  const [newActVideo, setNewActVideo] = useState("");
  const [newActDeadline, setNewActDeadline] = useState("");
  const [newActRubric, setNewActRubric] = useState("");
  const [newActRubricFile, setNewActRubricFile] = useState<File | null>(null);
  const [newActRubricFileName, setNewActRubricFileName] = useState("");
  const [newActRubricImportError, setNewActRubricImportError] = useState("");
  const [isImportingNewActRubric, setIsImportingNewActRubric] = useState(false);
  const [newActFile, setNewActFile] = useState<File | null>(null);
  const [isCreatingAct, setIsCreatingAct] = useState(false);
  const [newActCourseId, setNewActCourseId] = useState("");
  const [newActChapterId, setNewActChapterId] = useState("");
  const [newActPhase, setNewActPhase] = useState("Trước lớp");
  const [newActType, setNewActType] = useState("Bài tập");
  const [newActDuration, setNewActDuration] = useState("");
  const [newActAcceptingSubmissions, setNewActAcceptingSubmissions] = useState(true);
  const [rubricDocumentSchemaReady, setRubricDocumentSchemaReady] = useState(false);
  const [curriculumCourses, setCurriculumCourses] = useState<any[]>([]);
  const [curriculumChapters, setCurriculumChapters] = useState<any[]>([]);

  const newActivityChapters = curriculumChapters.filter(
    (chapter: any) => chapter.course_id === newActCourseId,
  );

  useEffect(() => {
    if (previewMode) {
      setRubricDocumentSchemaReady(true);
      setCurriculumCourses([{ id: "preview-course-tu-dien", title: "Vật lí 11", subject: "Vật lí", grade_level: 11 }]);
      setCurriculumChapters([{ id: "preview-chapter-tu-dien", course_id: "preview-course-tu-dien", title: "Tụ điện" }]);
      return;
    }
    (async () => {
      const [courseRes, chapterRes, guideRes] = await Promise.all([
        supabase.from("courses").select("id, title, subject, grade_level").order("title"),
        supabase.from("chapters").select("id, course_id, title").order("title"),
        supabase.from("activity_grading_guides").select("*").limit(1).maybeSingle(),
      ]);
      if (courseRes.data) setCurriculumCourses(courseRes.data);
      if (chapterRes.data) setCurriculumChapters(chapterRes.data);
      const documentFieldsReady = !!(guideRes.data && Object.prototype.hasOwnProperty.call(guideRes.data, "rubric_document_path"));
      setRubricDocumentSchemaReady(documentFieldsReady);
    })();
  }, [previewMode]);

  const readRubricFile = (file: File) =>
    extractRubricFile(file, previewMode ? async () => `[OCR mô phỏng cho ${file.name}. Nội dung thật sẽ được nhận dạng trong phiên giáo viên.]` : undefined);

  const resetForm = () => {
    setNewActTitle(""); setNewActDesc(""); setNewActVideo(""); setNewActDeadline("");
    setNewActRubric(""); setNewActFile(null); setNewActRubricFile(null);
    setNewActRubricFileName(""); setNewActRubricImportError("");
    setNewActCourseId(""); setNewActChapterId(""); setNewActPhase("Trước lớp");
    setNewActType("Bài tập"); setNewActDuration(""); setNewActAcceptingSubmissions(true);
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
      onCreated();
      resetForm();
      onNavigateTab("activities");
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
        const { error: upErr } = await supabase.storage.from("videos").upload(fileName, newActFile, { contentType: newActFile.type || "application/octet-stream" });
        if (upErr) throw new Error("Tải tài liệu lên thất bại: " + upErr.message);
        uploadedDocUrl = fileName;
      }

      const { data: createdActivity, error } = await supabase.from("activities").insert({
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
      }).select("id").single();
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
      const { error: guideError } = await supabase.from("activity_grading_guides").upsert(guidePayload);
      if (guideError) throw new Error("Không lưu được ma trận chấm: " + guideError.message);

      alert(`✅ Đã tạo thành công Bài tập số ${createdActivity.id}!`);
      resetForm();
      onNavigateTab("activities");
      onCreated();
    } catch (err: unknown) {
      if (createdActivityId !== null) await supabase.from("activities").delete().eq("id", createdActivityId);
      if (uploadedRubricPath) await supabase.storage.from("learning-resources").remove([uploadedRubricPath]);
      if (uploadedDocUrl) await supabase.storage.from("videos").remove([uploadedDocUrl]);
      alert("Không tạo được bài học: " + (err instanceof Error ? err.message : "Lỗi kết nối cơ sở dữ liệu."));
    } finally {
      setIsCreatingAct(false);
    }
  };

  return (
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
              placeholder="Nhập tên bài tập..."
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

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-indigo-950">Vị trí trong lộ trình</h3>
              <p className="mt-1 text-xs leading-5 text-indigo-800">Gắn bài này vào môn và chương để học sinh thấy nó trong giao diện tổng thể. Có thể tạo thêm môn/chương ở mục “Lộ trình môn &amp; chương”.</p>
            </div>
            <button type="button" onClick={() => onNavigateTab("curriculum")} className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100">Mở lộ trình</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">Môn học
              <select value={newActCourseId} onChange={(event) => { setNewActCourseId(event.target.value); setNewActChapterId(""); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Chưa gán môn học</option>
                {curriculumCourses.map((course) => <option key={course.id} value={course.id}>{course.subject ? `${course.subject} · ` : ""}{course.title} {course.grade_level ? `(Khối ${course.grade_level})` : ""}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">Chương
              <select
                value={newActChapterId}
                onChange={(event) => setNewActChapterId(event.target.value)}
                disabled={!newActCourseId}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                <option value="">Chưa gán chương</option>
                {newActivityChapters.map((chapter: any) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
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
            placeholder="Nhập yêu cầu nhiệm vụ..."
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
            onClearFile={() => { setNewActRubric(""); setNewActRubricFile(null); setNewActRubricFileName(""); setNewActRubricImportError(""); }}
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
            onClick={() => onNavigateTab("activities")}
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
  );
}
