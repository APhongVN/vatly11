import Link from "next/link";

const MOCK_STUDENTS = [
  { name: "Nguyễn Văn A", progress: 8, lastActive: "5 phút trước", misconceptions: ["C_DEPENDS_ON_U"] },
  { name: "Trần Thị B", progress: 12, lastActive: "2 phút trước", misconceptions: [] },
  { name: "Lê Văn C", progress: 4, lastActive: "1 giờ trước", misconceptions: ["SOURCE_STATE_CONFUSION", "SLOPE_Q_U_ERROR"] },
  { name: "Phạm Thị D", progress: 10, lastActive: "10 phút trước", misconceptions: ["CONFUSE_Q_C"] },
];

export default function GiaoVienPage() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Giáo viên</h1>
            <p className="text-gray-600 mt-1">Theo dõi tiến độ lớp 11A1</p>
          </div>
          <Link href="/" className="btn btn-secondary">← Về trang chủ</Link>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-500">Tổng HS</div>
            <div className="text-3xl font-bold">{MOCK_STUDENTS.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">TB hoàn thành</div>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(MOCK_STUDENTS.reduce((s, x) => s + x.progress, 0) / MOCK_STUDENTS.length)}/14
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Cần hỗ trợ</div>
            <div className="text-3xl font-bold text-orange-600">
              {MOCK_STUDENTS.filter(s => s.misconceptions.length > 0).length}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">AI review queue</div>
            <div className="text-3xl font-bold">2</div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Tiến độ từng HS</h2>
          <table className="w-full text-left">
            <thead className="text-sm text-gray-500 border-b">
              <tr>
                <th className="py-2">Học sinh</th>
                <th className="py-2">Tiến độ</th>
                <th className="py-2">Hoạt động cuối</th>
                <th className="py-2">Misconceptions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_STUDENTS.map((s) => (
                <tr key={s.name} className="border-b last:border-0">
                  <td className="py-3 font-medium">{s.name}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(s.progress/14)*100}%` }} />
                      </div>
                      <span className="text-sm">{s.progress}/14</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-gray-600">{s.lastActive}</td>
                  <td className="py-3">
                    {s.misconceptions.length === 0 ? (
                      <span className="text-xs text-green-600">✓ Không có</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {s.misconceptions.map(m => (
                          <span key={m} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{m}</span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}