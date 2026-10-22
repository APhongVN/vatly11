"use client";
export default function DebugPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    <div className="p-10 font-mono text-sm space-y-4">
      <h1 className="text-2xl font-bold text-blue-600">Trang Kiểm Tra Cấu Hình</h1>
      <div className="p-4 bg-gray-100 rounded border">
        <p><strong>SUPABASE URL:</strong> {url || "❌ CHƯA CÓ"}</p>
        <p className="mt-2"><strong>SUPABASE KEY:</strong> {key ? "✅ Đã có" : "❌ CHƯA CÓ"}</p>
      </div>
    </div>
  );
}