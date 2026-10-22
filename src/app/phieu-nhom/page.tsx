"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Users, UploadCloud, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
        .select('group_id, group_assignment_groups!inner(assignment_id, group_number)')
        .eq('student_id', parsed.id)
        .eq('group_assignment_groups.assignment_id', assignmentId)
        .single();

      if (memberData) {
        setMyGroup(memberData.group_assignment_groups);
        // Lấy danh sách thành viên trong nhóm
        const { data: allMembers } = await supabase.from('group_assignment_members')
          .select('students(full_name)')
          .eq('group_id', memberData.group_id);
        if (allMembers) setMembers(allMembers.map((m: any) => m.students.full_name));

        // Kiểm tra xem nhóm đã nộp bài chưa
        const { data: existingSub } = await supabase.from('group_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('group_name', `Nhóm ${memberData.group_assignment_groups.group_number}`)
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
      const fileName = `groups/${assignmentId}-${myGroup.group_number}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, file);
      if (!uploadError) {
        const { data } = await supabase.storage.from('videos').getPublicUrl(fileName);
        uploadedUrl = data.publicUrl;
      }
    }

    const groupName = `Nhóm ${myGroup.group_number}`;

    await supabase.from('group_submissions').delete().eq('assignment_id', assignmentId).eq('group_name', groupName);

    const { error } = await supabase.from('group_submissions').insert([{
      assignment_id: assignmentId,
      group_name: groupName,
      answer: textAnswer,
      file_url: uploadedUrl,
      status: 'pending',
      submitted_at: new Date().toISOString()
    }]);

    if (!error) setSuccess(true);
    else alert("Lỗi nộp bài: " + error.message);
    
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;
  if (!assignment) return <div className="min-h-screen text-center p-10">Không tìm thấy bài tập.</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-xl border max-w-3xl w-full overflow-hidden relative">
        <Link href="/hoc-sinh" className="absolute top-6 left-6 text-gray-500 hover:text-blue-600 flex items-center gap-1 text-sm font-medium"><ArrowLeft className="w-4 h-4"/> Quay lại</Link>
        
        <div className="bg-orange-600 p-8 text-white text-center">
          <h1 className="text-2xl font-bold mb-2">Phiếu Học Tập Nhóm</h1>
          <p className="text-orange-100">{assignment.title}</p>
        </div>

        <div className="p-8 space-y-6">
          {!myGroup ? (
            <div className="text-center py-10 bg-red-50 rounded-xl border border-red-100">
              <Users className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-700">Em chưa có trong nhóm nào!</h3>
              <p className="text-red-600 mt-1">Vui lòng liên hệ Cô giáo để được phân công vào nhóm trước khi làm bài.</p>
            </div>
          ) : success ? (
            <div className="text-center py-10 bg-green-50 rounded-xl border border-green-100">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-700 mb-2">Nhóm đã nộp bài!</h3>
              <p className="text-green-600 mb-4">Bài làm của {`Nhóm ${myGroup.group_number}`} đã được gửi đến giáo viên.</p>
              <button onClick={() => setSuccess(false)} className="text-blue-600 underline text-sm font-medium">Nộp lại / Chỉnh sửa</button>
            </div>
          ) : (
            <>
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
                <Users className="w-6 h-6 text-orange-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-orange-800">Nhóm của em: {`Nhóm ${myGroup.group_number}`}</h4>
                  <p className="text-sm text-orange-700 mt-1">Thành viên: {members.join(', ')}</p>
                  <p className="text-xs text-orange-600 mt-2 italic">*Chỉ cần 1 thành viên đại diện nộp bài. Bài nộp sẽ được tính điểm chung cho cả nhóm.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Nội dung thảo luận / Bài làm nhóm</label>
                  <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)} className="w-full p-3 border rounded-xl h-40 outline-none focus:ring-2 focus:ring-orange-500" placeholder="Nhập câu trả lời hoặc kết quả thảo luận của nhóm tại đây..." required />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Đính kèm File (Ảnh, PDF, Word...)</label>
                  <div className="border-2 border-dashed border-orange-200 bg-orange-50/50 rounded-xl p-4 text-center cursor-pointer relative">
                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <UploadCloud className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-orange-700">{file ? file.name : "Bấm để tải file lên"}</p>
                  </div>
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 flex justify-center items-center gap-2">
                  <Send className="w-5 h-5"/> {submitting ? "Đang gửi bài..." : "Nộp bài cho Nhóm"}
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
  return <Suspense fallback={<div>Đang tải...</div>}><GroupWorksheet /></Suspense>;
}