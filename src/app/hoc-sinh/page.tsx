import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import { ACTIVITIES } from "@/lib/data/activities";

export default function HocSinhPage() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Xin chào, Học sinh!</h1>
            <p className="text-gray-600 mt-1">Tiến độ của em trong bài Tụ điện</p>
          </div>
          <Link href="/" className="btn btn-secondary">← Về trang chủ</Link>
        </div>

        <ProgressBar />

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">14 hoạt động</h2>
          <div className="grid gap-3">
            {ACTIVITIES.map((act) => (
              <Link
                key={act.id}
                href={`/hoat-dong/${act.id}`}
                className="card flex items-center justify-between hover:shadow-md transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {act.id}
                  </div>
                  <div>
                    <div className="font-medium">{act.title}</div>
                    <div className="text-sm text-gray-500">{act.phase} · {act.duration}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  act.status === "available" ? "bg-blue-100 text-blue-700" :
                  act.status === "done" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {act.status === "available" ? "Sẵn sàng" :
                   act.status === "done" ? "Hoàn thành" : "Chưa mở"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}