"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Users, UploadCloud, Send, CheckCircle2, ArrowLeft, FileText, ExternalLink, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";

const groupResourceHref = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  const bucket = /^(chat|submissions|group-submissions)\//.test(value) ? "class-work" : "videos";
  return `/api/files?bucket=${bucket}&path=${encodeURIComponent(value)}`;
};

function GroupWorksheet() {
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get('assignment');
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [myGroup, setMyGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('student_session');
    if (!session) { router.push('/login'); return; }
    const parsed = JSON.parse(session);
    setStudent(parsed);

    const fetchData = async () => {
      const { data: act } = await supabase.from('group_assignments').select('*').eq('id', assignmentId).single();
      setAssignment(act);

      // Tìm nhóm của sinh viên này trong bài tập này
      const { data: memberData } = await supabase.from('group_assignment_members')
        .select('group_id, group_assignment_groups!inner(assignment_id, group_number, group_name)')
        .eq('student_id', parsed.id)
        .eq('group_assignment_groups.assignment_id', assignmentId)
        .single();

      if (memberData) {
        setMyGroup({ ...(memberData.group_assignment_groups as any), id: memberData.group_id });
        // Lấy danh sách thành viên trong nhóm
        const { data: allMembers } = await supabase.from('group_assignment_members')
          .select('students(full_name)')
          .eq('group_id', memberData.group_id);
        if (allMembers) setMembers(allMembers.map((m: any) => m.students?.full_name).filter(Boolean));

        // Kiểm tra xem nhóm đã nộp bài chưa
        const groupNumber = (memberData.group_assignment_groups as any)?.group_number;
        const groupName = (memberData.group_assignment_groups as any)?.group_name || `Nhóm ${groupNumber}`;
        const { data: existingSub } = await supabase.from('group_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('group_id', memberData.group_id)
          .single();
        if (existingSub) {
          setTextAnswer(existingSub.answer || "");
          setSuccess(true);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [assignmentId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGroup) return alert("Em chưa được xếp vào nhóm nào cho bài này!");
    setSubmitting(true);

    let uploadedUrl = "";
    if (file) {
      if (file.size > 25 * 1024 * 1024) { alert("Tệp nộp nhóm tối đa 25 MB."); setSubmitting(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."); setSubmitting(false); return; }
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `group-submissions/${user.id}/${Date.now()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage.from('class-work').upload(fileName, file, { contentType: file.type || "application/octet-stream" });
      if (uploadError) { alert("Không tải được tệp nhóm: " + uploadError.message); setSubmitting(false); return; }
      uploadedUrl = fileName;
    }

    const groupName = myGroup.group_name || `Nhóm ${myGroup.group_number}`;

    const { error } = await supabase.from('group_submissions').upsert({
      assignment_id: assignmentId,
      group_name: groupName,
      group_id: myGroup.id,
      answer: textAnswer,
      file_url: uploadedUrl,
      status: 'pending',
      submitted_at: new Date().toISOString()
    }, { onConflict: "group_id" });

    if (!error) setSuccess(true);
    else alert("Lỗi nộp bài: " + error.message);

    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-semibold">Đang tải phiếu học tập nhóm...</div>;
  if (!assignment) return <div className="min-h-screen text-center p-12 text-slate-500">Không tìm thấy bài tập nhóm tương ứng.</div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-indigo-50/20 p-4 md:p-8 flex justify-center items-center">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-3xl w-full overflow-hidden relative">
        <div className="p-6 md:p-8 border-b bg-gradient-to-r from-orange-600 to-amber-600 text-white relative">
          <Link href="/hoc-sinh" className="inline-flex items-center gap-1.5 text-xs text-orange-100 hover:text-white font-semibold mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4"/> Về trang Học sinh
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-200 mb-1">
            <Users className="w-4 h-4" /> Phiếu học tập nhóm
          </div>
          <h1 className="text-2xl md:text-3xl font-black">{assignment.title}</h1>
          {assignment.description && (
            <p className="text-orange-100 text-xs md:text-sm mt-2 leading-relaxed">{assignment.description}</p>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* TÀI LIỆU VÀ TIÊU CHÍ CHẤM ĐIỂM CỦA GIÁO VIÊN */}
          {(assignment.document_url || assignment.rubric) && (
            <div className="p-5 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-orange-600" /> Tài liệu & Hướng dẫn từ Giáo viên:
              </h3>

              {assignment.document_url && (
                <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-orange-200">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <span>Tài liệu / Đề bài nghiên cứu của nhóm</span>
                  </div>
                  <a
                    href={groupResourceHref(assignment.document_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Mở xem tài liệu
                  </a>
                </div>
              )}

              {assignment.rubric && (
                <div className="text-xs text-slate-700 bg-white/80 p-3.5 rounded-xl border border-orange-100 space-y-1">
                  <span className="font-bold text-orange-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600" /> Tiêu chí chấm điểm (Rubric):
                  </span>
                  <p className="whitespace-pre-line text-slate-600">{assignment.rubric}</p>
                </div>
              )}
            </div>
          )}

          {!myGroup ? (
            <div className="text-center py-12 bg-rose-50 rounded-2xl border border-rose-100 space-y-3">
              <Users className="w-12 h-12 text-rose-400 mx-auto" />
              <h3 className="text-base font-bold text-rose-800">Em chưa được phân vào nhóm nào cho bài này!</h3>
              <p className="text-xs text-rose-600 max-w-md mx-auto">
                Vui lòng nhắn tin cho Cô giáo qua kênh Chat thảo luận để được phân công nhóm nhé.
              </p>
            </div>
          ) : success ? (
            <div className="text-center py-12 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
              <div>
                <h3 className="text-xl font-bold text-emerald-800">Nhóm đã nộp bài thành công!</h3>
                <p className="text-xs text-emerald-600 mt-1">
                  Bài làm của <strong>{myGroup.group_name || `Nhóm ${myGroup.group_number}`}</strong> đã được ghi nhận trong hệ thống.
                </p>
              </div>
              <button
                onClick={() => setSuccess(false)}
                className="px-5 py-2.5 bg-white border border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                Chỉnh sửa / Nộp lại bài
              </button>
            </div>
          ) : (
            <>
              {/* Box nhóm của em */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-3.5">
                <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center shrink-0 font-bold">
                  N{myGroup.group_number}
                </div>
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">Nhóm của em: {myGroup.group_name || `Nhóm ${myGroup.group_number}`}</h4>
                  <p className="text-slate-600"><span className="font-semibold text-slate-900">Các thành viên:</span> {members.length > 0 ? members.join(', ') : "Đang cập nhật"}</p>
                  <p className="text-slate-400 italic">*Chỉ cần một thành viên nộp đại diện, điểm số sẽ được ghi nhận cho cả nhóm.</p>
                </div>
              </div>

              {/* Form nộp */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
                    Báo cáo thảo luận / Lời giải của nhóm:
                  </label>
                  <textarea
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    className="w-full p-4 border border-slate-200 rounded-2xl h-44 outline-none focus:ring-2 focus:ring-orange-500 text-sm leading-relaxed bg-slate-50/50"
                    placeholder="Trình bày kết quả nghiên cứu, thí nghiệm, bảng số liệu hoặc câu trả lời của nhóm..."
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
                    Đính kèm Tệp (Bài trình chiếu PowerPoint, PDF, Word, Ảnh thí nghiệm):
                  </label>
                  <div className="border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/30 rounded-2xl p-6 text-center cursor-pointer relative transition-all">
                    <input
                      type="file"
                      onChange={e => setFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-orange-900">{file ? file.name : "Bấm để chọn tệp bài làm nhóm"}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Hỗ trợ PPTX, PDF, DOCX, ZIP, MP4</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4"/> {submitting ? "Đang gửi bài nộp nhóm..." : "Xác nhận nộp bài cho cả nhóm"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Đang tải...</div>}>
      <GroupWorksheet />
    </Suspense>
  );
}
