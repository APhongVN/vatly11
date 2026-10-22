export type Activity = {
  id: number;
  title: string;
  phase: string;
  duration: string;
  status: "locked" | "available" | "done";
};

export const ACTIVITIES: Activity[] = [
  { id: 1, title: "Xác định vấn đề bài học", phase: "Trước lớp", duration: "8-10 phút", status: "available" },
  { id: 2, title: "Microteaching - Video bài giảng", phase: "Trước lớp", duration: "20-25 phút", status: "available" },
  { id: 3, title: "Đề xuất dự đoán/giả thuyết", phase: "Trước lớp", duration: "10-12 phút", status: "available" },
  { id: 4, title: "Khám phá bằng thí nghiệm ảo", phase: "Trước lớp", duration: "30-40 phút", status: "available" },
  { id: 5, title: "Quan sát thí nghiệm thật", phase: "Trước lớp", duration: "8-10 phút", status: "available" },
  { id: 6, title: "Kiểm tra mức sẵn sàng", phase: "Trước lớp", duration: "10 phút", status: "available" },
  { id: 7, title: "Kích hoạt kiến thức", phase: "Trên lớp", duration: "10-12 phút", status: "available" },
  { id: 8, title: "Cấu tạo - tích/phóng điện", phase: "Trên lớp", duration: "20-25 phút", status: "locked" },
  { id: 9, title: "Điện dung và yếu tố ảnh hưởng", phase: "Trên lớp", duration: "30-35 phút", status: "locked" },
  { id: 10, title: "Ghép tụ điện", phase: "Trên lớp", duration: "20-25 phút", status: "locked" },
  { id: 11, title: "Năng lượng tụ điện", phase: "Trên lớp", duration: "20-25 phút", status: "locked" },
  { id: 12, title: "Luyện tập - Củng cố", phase: "Trên lớp", duration: "20 phút", status: "available" },
  { id: 13, title: "Vận dụng xa và dự án", phase: "Sau lớp", duration: "Ngoài giờ", status: "locked" },
  { id: 14, title: "Phản tư - Luyện tập giãn cách", phase: "Sau lớp", duration: "15-20 phút", status: "locked" },
];