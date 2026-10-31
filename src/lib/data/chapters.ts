import { Activity } from "./activities";

export type Chapter = {
  id: number;
  title: string;
  description: string;
  course_id: string; // FK to courses
};

export const CHAPTERS = [
  {
    id: 1,
    title: "Điện tích - Điện trường",
    description: "Khái niệm cơ bản về điện và điện trường",
    course_id: "phys-11",
  },
  {
    id: 2,
    title: "Dòng điện không đổi",
    description: "Hiểu về dòng điện liên tục và điện áp",
    course_id: "phys-11",
  },
  {
    id: 3,
    title: "Luyện tập - Củng cố",
    description: "Áp dụng kiến thức qua các bài tập",
    course_id: "phys-11",
  },
  {
    id: 4,
    title: "Tụ điện",
    description: "Chương mẫu Vật lí 11: bài giảng, dự đoán, thí nghiệm, luyện tập và vận dụng.",
    course_id: "phys-11",
  },
  {
    id: 5,
    title: "Phản tư - Luyện tập giãn cách",
    description: "Bài tập tự luyện sau giờ học",
    course_id: "phys-11",
  }
];