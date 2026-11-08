"use client";
import { LoaderCircle } from "lucide-react";

/**
 * Trạng thái đang tải dùng chung, đồng bộ thẩm mỹ toàn ứng dụng.
 * variant: "page" cho cả trang, "card" cho khối nhỏ, "inline" cho dòng chữ.
 */
export default function LoadingState({
  label = "Đang tải…",
  variant = "card",
}: {
  label?: string;
  variant?: "page" | "card" | "inline";
}) {
  if (variant === "inline") {
    return (
      <span role="status" className="inline-flex items-center gap-2 text-xs text-slate-500">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> {label}
      </span>
    );
  }
  if (variant === "page") {
    return (
      <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">{label}</p>
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
      <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" /> {label}
    </div>
  );
}
