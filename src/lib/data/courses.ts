export type Course = {
  id: string;
  title: string;
  description: string;
  grade_level: number;
  subject: string;
  created_at: string;
};

export const COURSES = [
  {
    id: "phys-11",
    title: "Vật lý 11",
    description: "Vật lý 11 - Lớp học đảo ngược",
    grade_level: 11,
    subject: "Vật lý",
    created_at: "2024-01-01"
  },
  {
    id: "math-10",
    title: "Toán 10",
    description: "Toán 10 - Đại số và Giải tích",
    grade_level: 10,
    subject: "Toán",
    created_at: "2024-01-01"
  },
  {
    id: "chem-11",
    title: "Hóa học 11",
    description: "Hóa học 11 - Các phản ứng cơ bản",
    grade_level: 11,
    subject: "Hóa học",
    created_at: "2024-01-01"
  }
];