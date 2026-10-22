import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-5xl font-bold text-blue-700 mb-3">Tụ điện</h1>
          <p className="text-xl text-gray-600">Vật lí 11 - Lớp học đảo ngược</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/hoc-sinh" className="card hover:shadow-md transition text-left">
            <div className="text-3xl mb-2">🎓</div>
            <h2 className="text-xl font-semibold mb-1">Học sinh</h2>
            <p className="text-gray-600 text-sm">Vào làm bài tập và thí nghiệm</p>
          </Link>

          <Link href="/giao-vien" className="card hover:shadow-md transition text-left">
            <div className="text-3xl mb-2">📊</div>
            <h2 className="text-xl font-semibold mb-1">Giáo viên</h2>
            <p className="text-gray-600 text-sm">Xem dashboard và tiến độ lớp</p>
          </Link>
        </div>

        <div className="text-sm text-gray-500 pt-8">
          14 hoạt động · 6 thí nghiệm ảo · AI chấm rubric
        </div>
      </div>
    </main>
  );
}