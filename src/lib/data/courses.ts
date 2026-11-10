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
    title: "Vật lí",
    description: "Chuyên đề Tụ điện theo mô hình lớp học đảo ngược.",
    grade_level: 11,
    subject: "Vật lí",
    created_at: "2024-01-01"
  },
];
