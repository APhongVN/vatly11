"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ACTIVITIES } from "@/lib/data/activities";
import { HD1_CHECKPOINTS, HD12_QUESTIONS, HD6_PREQUIZ, HD7_PEER } from "@/lib/data/questions";
import VideoPlayer from "@/components/VideoPlayer";
import VirtualLab from "@/components/VirtualLab";
import Quiz from "@/components/Quiz";

export default function ActivityPage() {
  const params = useParams();
  const id = Number(params.id);
  const activity = ACTIVITIES.find(a => a.id === id);

  if (!activity) return <main className="p-10 text-center">Không tìm thấy hoạt động</main>;

  const renderContent = () => {
    switch (id) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-gray-600">Xem video và trả lời checkpoint để hiểu vấn đề bài học.</p>
            <VideoPlayer activityId={1} src="/videos/hd1.mp4" checkpoints={HD1_CHECKPOINTS} />
          </div>
        );
      case 3:
        return <div className="card">Giao diện dự đoán đang phát triển...</div>;
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-gray-600">Thí nghiệm VL-02: Điều tra quan hệ Q-U. Thu ≥5 phép đo rồi vẽ đồ thị.</p>
            <VirtualLab activityId={4} />
          </div>
        );
      case 6:
        return <Quiz activityId={6} questions={HD6_PREQUIZ} />;
      case 7:
        return <Quiz activityId={7} questions={HD7_PEER} />;
      case 12:
        return <Quiz activityId={12} questions={HD12_QUESTIONS} />;
      default:
        return <div className="card text-center py-12">Hoạt động này đang được phát triển 🚧</div>;
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/hoc-sinh" className="btn btn-secondary">← Dashboard</Link>
          <span className="text-sm text-gray-500">{activity.phase} · {activity.duration}</span>
        </div>
        <div>
          <div className="text-sm text-blue-600 font-medium">HOẠT ĐỘNG {activity.id}</div>
          <h1 className="text-3xl font-bold">{activity.title}</h1>
        </div>
        {renderContent()}
      </div>
    </main>
  );
}