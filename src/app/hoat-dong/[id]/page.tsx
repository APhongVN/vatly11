import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { ACTIVITIES } from "@/lib/data/activities";
import curriculum from "@/lib/data/curriculum.json";
import ActivityInteractions from "@/components/ActivityInteractions";
import ActivityResources from "@/components/ActivityResources";
import SubmissionWindow from "@/components/SubmissionWindow";
import { filterStudentTable, isTeacherOnlyText } from "@/lib/curriculum-privacy.mjs";
import { createSupabasePublicClient } from "@/lib/supabase-public";

export const dynamic = "force-dynamic";

type CurriculumBlock = { type: "paragraph"; text: string } | { type: "table"; rows: string[][] };
type CurriculumActivity = { id: number; sourceSections: string[]; blocks: CurriculumBlock[] };
const curriculumById = new Map((curriculum as CurriculumActivity[]).map((activity) => [activity.id, activity]));
type ActivityPageData = {
  id: number;
  code: string;
  title: string;
  phase: string;
  duration: string;
  description: string;
  deliverable: string;
  isSourceLesson: boolean;
  acceptingSubmissions: boolean;
  deadline: string | null;
};

function StudentSourceBlock({ block }: { block: CurriculumBlock }) {
  if (block.type === "paragraph") {
    if (isTeacherOnlyText(block.text) || /^HOẠT ĐỘNG\s+\d+\./.test(block.text)) return null;
    return <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{block.text}</p>;
  }
  const safeTable = filterStudentTable(block);
  if (!safeTable) return null;
  const [header, ...safeRows] = safeTable.rows;
  return <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[480px] border-collapse text-left text-sm"><thead className="bg-slate-50"><tr>{header.map((cell, index) => <th key={index} className="border-b px-3 py-2.5 font-bold text-slate-700">{cell}</th>)}</tr></thead><tbody>{safeRows.map((row, rowIndex) => <tr key={rowIndex} className="align-top even:bg-slate-50/60">{row.map((cell, cellIndex) => <td key={cellIndex} className="border-b border-slate-100 px-3 py-2.5 leading-6 text-slate-700">{cell}</td>)}</tr>)}</tbody></table></div>;
}
function SourceLesson({ id }: { id: number }) {
  const source = curriculumById.get(id);
  if (!source) return null;
  const sections: { title: string; blocks: CurriculumBlock[] }[] = [];
  for (const block of source.blocks) {
    if (block.type === "paragraph" && /^HOẠT ĐỘNG\s+\d+\./.test(block.text)) sections.push({ title: block.text, blocks: [] });
    else if (sections.length) sections[sections.length - 1].blocks.push(block);
  }
  return <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="mb-4 flex items-start gap-3"><BookOpen className="mt-1 h-5 w-5 shrink-0 text-blue-700" /><div><h2 className="text-xl font-extrabold">Nội dung chi tiết theo tài liệu cô gửi</h2><p className="mt-1 text-xs leading-5 text-slate-500">Các mục 8–11 đã gộp trong cùng hoạt động 8. Đáp án và rubric dành riêng cho giáo viên được ẩn khỏi phần học sinh.</p></div></div>{sections.map((section, index) => { let hideNextTable = false; const visibleBlocks = section.blocks.filter((block) => { if (block.type === "paragraph" && isTeacherOnlyText(block.text)) { hideNextTable = true; return false; } if (block.type === "table" && hideNextTable) { hideNextTable = false; return false; } return true; }); return <details key={`${section.title}-${index}`} open={index === 0} className="group rounded-2xl border border-slate-200"><summary className="cursor-pointer list-none rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-800 marker:hidden">{section.title}<span className="float-right text-slate-400">⌄</span></summary><div className="space-y-3 p-4">{visibleBlocks.map((block, blockIndex) => <StudentSourceBlock key={blockIndex} block={block} />)}</div></details>; })}</section>;
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if ([9, 10, 11].includes(id)) redirect("/hoat-dong/8");
  if (!Number.isInteger(id) || id < 1) notFound();
  const sourceActivity = ACTIVITIES.find((item) => item.id === id);
  let activity: ActivityPageData | null = sourceActivity ? {
    ...sourceActivity,
    isSourceLesson: true,
    acceptingSubmissions: true,
    deadline: null,
  } : null;
  let databaseActivity: {
    id: number;
    title: string;
    description: string | null;
    phase: string | null;
    duration: string | null;
    deliverable: string | null;
    status: string;
    accepting_submissions: boolean;
    deadline: string | null;
  } | null = null;
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("activities")
      .select("id,title,description,phase,duration,deliverable,status,accepting_submissions,deadline")
      .eq("id", id)
      .abortSignal(AbortSignal.timeout(2500))
      .maybeSingle();
    if (error) throw error;
    databaseActivity = data;
  } catch (error) {
    console.error("Không tải được trạng thái hoạt động:", error instanceof Error ? error.message : "unknown error");
    if (!sourceActivity) notFound();
  }

  if (databaseActivity && databaseActivity.status !== "available") notFound();
  if (sourceActivity && databaseActivity) {
    activity = {
      ...sourceActivity,
      isSourceLesson: true,
      acceptingSubmissions: databaseActivity.accepting_submissions,
      deadline: databaseActivity.deadline,
    };
  } else if (!activity && databaseActivity) {
    activity = {
      id: databaseActivity.id,
      code: `BÀI-${databaseActivity.id}`,
      title: databaseActivity.title,
      phase: databaseActivity.phase || "Theo kế hoạch giáo viên",
      duration: databaseActivity.duration || "Theo hướng dẫn giáo viên",
      description: databaseActivity.description || "Bài học do giáo viên tạo.",
      deliverable: databaseActivity.deliverable || "Hoàn thành nhiệm vụ theo hướng dẫn của giáo viên.",
      isSourceLesson: false,
      acceptingSubmissions: databaseActivity.accepting_submissions,
      deadline: databaseActivity.deadline,
    };
  }
  if (!activity) notFound();
  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6"><div className="flex items-center justify-between gap-4"><Link href="/chapters" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Tổng quan chương</Link><span className="text-right text-xs text-slate-500">{activity.phase} · {activity.duration}</span></div><header className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-xl md:p-9"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-200">Hoạt động {activity.id} · {activity.code}</p><h1 className="mt-2 text-3xl font-black md:text-4xl">{activity.title}</h1><p className="mt-3 max-w-3xl leading-7 text-blue-100">{activity.description}</p><div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4"><b className="text-xs uppercase tracking-wide text-blue-100">Sản phẩm học tập</b><p className="mt-1 text-sm">{activity.deliverable}</p></div></header>{activity.isSourceLesson ? <><SubmissionWindow acceptingSubmissions={activity.acceptingSubmissions} deadline={activity.deadline}><ActivityInteractions activityId={id} /></SubmissionWindow><SourceLesson id={id} /></> : <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 shadow-sm md:p-7"><h2 className="text-xl font-extrabold text-blue-950">Nhiệm vụ do giáo viên thiết kế</h2><p className="mt-3 text-sm leading-7 text-slate-700">Đọc yêu cầu phía trên và mở các học liệu đính kèm bên dưới.</p><SubmissionWindow acceptingSubmissions={activity.acceptingSubmissions} deadline={activity.deadline}><Link href={`/nop-bai?activity=${id}`} className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Đi đến trang nộp bài</Link></SubmissionWindow></section>}<ActivityResources activityId={id} /></div></main>;
}
