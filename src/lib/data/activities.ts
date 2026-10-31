export type Activity = {
  id: number;
  code: string;
  title: string;
  phase: "Trước lớp" | "Trên lớp" | "Sau lớp";
  type: "Bài giảng" | "Bài tập" | "Thí nghiệm" | "Dự án" | "Phản tư";
  duration: string;
  status: "locked" | "available" | "done";
  description: string;
  deliverable: string;
  model_answer?: string;
  grading_rubric?: string;
  course_id?: string;
  chapter_id?: string;
  video_url?: string;
  document_url?: string;
};

export const ACTIVITIES: Activity[] = [
  {
    id: 1,
    code: "PRE01",
    title: "Xác định vấn đề bài học",
    phase: "Trước lớp",
    type: "Bài giảng",

    duration: "8–10 phút",
    status: "available",
    deliverable: "Câu hỏi vấn đề + giải thích ban đầu",
    description: "Xem video tình huống mở đầu về tụ điện nạp xả làm sáng đèn LED, đưa ra dự đoán và giải thích lí do.",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 2,
    code: "PRE02",
    title: "Microteaching – video bài giảng ngắn",
    phase: "Trước lớp",
    type: "Bài giảng",

    duration: "20–25 phút",
    status: "available",
    deliverable: "4 video bài giảng + hoàn thành checkpoint",
    description: "Xem 4 video ngắn về tụ điện trong đời sống, cấu tạo nạp phóng, định nghĩa điện dung Q-U và ghép tụ, năng lượng.",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 3,
    code: "PRE03",
    title: "Đề xuất dự đoán / Giả thuyết khoa học",
    phase: "Trước lớp",
    type: "Bài tập",

    duration: "10–12 phút",
    status: "available",
    deliverable: "4 giả thuyết cá nhân bất biến (HYP-Q-U, HYP-C-S, HYP-C-D, HYP-C-EPS)",
    description: "Đề xuất 4 giả thuyết khoa học về mối quan hệ giữa Q và U, giữa C với diện tích S, khoảng cách d và hằng số điện môi εr.",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 4,
    code: "PRE04",
    title: "Khám phá bằng phòng thí nghiệm ảo",
    phase: "Trước lớp",
    type: "Thí nghiệm",

    duration: "30–40 phút",
    status: "available",
    deliverable: "6 thí nghiệm mô phỏng + Sổ tay điều tra",
    description: "Thực hành tương tác trực tiếp: điều chỉnh diện tích S, khoảng cách d, điện môi εr, đo U và Q, vẽ đường hồi quy Q-U.",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 5,
    code: "PRE05",
    title: "Quan sát và phân tích thí nghiệm thật",
    phase: "Trước lớp",
    type: "Bài giảng",

    duration: "8–10 phút",
    status: "available",
    deliverable: "Báo cáo Prediction – Evidence – Revision",
    description: "Quan sát video thí nghiệm thực tế với tụ điện phân 1000uF - 4700uF, đối chiếu dự đoán ban đầu với bằng chứng thực nghiệm.",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 6,
    code: "PRE06",
    title: "Kiểm tra mức sẵn sàng trước giờ học",
    phase: "Trước lớp",
    type: "Bài tập",

    duration: "10 phút",
    status: "available",
    deliverable: "Pre-class readiness quiz (10 câu) + Điểm nghẽn nhận thức (Muddy Point)",
    description: "Bộ câu hỏi kiểm tra nhanh 10 câu (R1-R10) về cấu tạo, điện tích, điện dung, ghép tụ và nêu điều em còn băn khoăn nhất.",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 7,
    code: "IN01",
    title: "Kích hoạt kiến thức và đối chiếu dự đoán",
    phase: "Trên lớp",
    type: "Bài tập",

    duration: "10–12 phút",
    status: "available",
    deliverable: "Bình chọn Peer Instruction (PI1, PI2, PI3) và tranh luận cặp",
    description: "Hoạt động thảo luận tại lớp: Biểu quyết cá nhân → Xem phân bố ẩn danh → Thảo luận cặp 2 phút → Biểu quyết lại và giáo viên giải thích.",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 8,
    code: "IN02-IN05",
    title: "Các thí nghiệm liên quan đến tụ điện",
    phase: "Trên lớp",
    type: "Thí nghiệm",

    duration: "60–80 phút",
    status: "available",
    deliverable: "Bộ Phiếu học tập thực nghiệm & Mô hình hóa 1, 2A-2B, 3, 4",
    description: "Hoạt động trọng tâm trên lớp tích hợp 4 nội dung thực nghiệm: (1) Cấu tạo, tích điện và phóng điện; (2) Điện dung và các yếu tố ảnh hưởng (Jigsaw S, d, εr); (3) Ghép tụ nối tiếp và song song; (4) Năng lượng điện trường qua đồ thị U=f(Q).",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 12,
    code: "IN06",
    title: "Luyện tập – củng cố – vận dụng gần",
    phase: "Trên lớp",
    type: "Bài tập",

    duration: "20 phút",
    status: "available",
    deliverable: "Game 'Capacitor Challenge' 16 câu + Bài tập phân hóa 4 Level",
    description: "Thi đấu trắc nghiệm nhanh 16 câu hỏi củng cố và bài tập phân hóa theo 4 cấp độ (từ tính Q cơ bản đến thiết kế mạch ghép tụ).",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 13,
    code: "POST01",
    title: "Vận dụng xa và thiết kế dự án",
    phase: "Sau lớp",
    type: "Dự án",

    duration: "1–2 tuần",
    status: "available",
    deliverable: "Báo cáo dự án giải pháp tích trữ năng lượng (PDF 2-4 trang hoặc Poster/Video)",
    description: "Dự án STEM: Thiết kế giải pháp nguồn dự phòng trong thời gian ngắn cho thiết bị 12V, năng lượng tối thiểu 0.10J bằng catalogue tụ điện giả lập.",
    course_id: "phys-11",
    chapter_id: "4"
  },
  {
    id: 14,
    code: "POST02",
    title: "Phản tư – luyện tập giãn cách – chuyển giao",
    phase: "Sau lớp",
    type: "Phản tư",

    duration: "15–20 phút + mở trễ",
    status: "available",
    deliverable: "4 câu hỏi Reflection (REF1-REF4) + 8 bài tập chuyển giao Delayed Practice (D1-D8)",
    description: "Tự đánh giá sự thay đổi nhận thức, nhận diện sai lầm đã khắc phục và làm bài tập giãn cách sau 1 tuần để ghi nhớ dài hạn.",
    course_id: "phys-11",
    chapter_id: "4"
  }
];
