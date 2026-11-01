"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function SubmissionWindow({ acceptingSubmissions, deadline, children }: {
  acceptingSubmissions: boolean;
  deadline: string | null;
  children: ReactNode;
}) {
  const [availability, setAvailability] = useState<"checking" | "open" | "closed" | "expired">("checking");

  useEffect(() => {
    const parsedDeadline = deadline ? Date.parse(deadline) : null;
    const expired = parsedDeadline !== null && Number.isFinite(parsedDeadline) && parsedDeadline < Date.now();
    const validDeadline = parsedDeadline === null || (Number.isFinite(parsedDeadline) && parsedDeadline >= Date.now());
    setAvailability(!acceptingSubmissions || !validDeadline ? "closed" : expired ? "expired" : "open");
  }, [acceptingSubmissions, deadline]);

  if (availability === "checking") return <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Đang kiểm tra thời hạn nộp bài…</p>;
  if (availability !== "open") return <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Hoạt động hiện không nhận bài{availability === "expired" ? " vì đã qua hạn nộp" : " theo thiết lập của giáo viên"}. Em vẫn có thể xem nội dung và học liệu.</p>;
  return <>{children}</>;
}
