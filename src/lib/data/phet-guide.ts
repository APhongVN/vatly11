// Dữ liệu cho video hướng dẫn PhET (đặc tả 4.2).
// Video tham chiếu: "Virtual Capacitor Lab Guide | Using PhET Simulations".
export const PHET_VIDEO_ID = "jt6-0Du3w2M";
export const PHET_VIDEO_URL = `https://youtu.be/${PHET_VIDEO_ID}`;
export const PHET_SIM_URL = "https://phet.colorado.edu/en/simulations/capacitor-lab-basics";
export const PHET_EMBED_URL = `https://www.youtube-nocookie.com/embed/${PHET_VIDEO_ID}?rel=0&enablejsapi=1`;

export type GuideQuestion = { id: string; at: number; prompt: string; options: string[]; answer: number };

// Nhóm câu hỏi tương tác của video hướng dẫn (đặc tả 4.2):
// chọn mô phỏng Capacitor Lab: Basics; nhận biết điện dung, diện tích, khoảng cách;
// điều chỉnh điện áp và quan sát điện tích; công cụ điện trường; đóng/ngắt mạch;
// vôn kế và dấu hiệu điện thế khi đảo đầu đo.
export const GUIDE_QUESTIONS: GuideQuestion[] = [
  { id: "g1", at: 90, prompt: "Mô phỏng nào em sẽ dùng để khảo sát tụ điện?", options: ["Capacitor Lab: Basics", "Ohm's Law", "Forces and Motion", "Circuit Construction Kit"], answer: 0 },
  { id: "g2", at: 200, prompt: "Ba đại lượng cơ bản em cần nhận biết khi mở mô phỏng là gì?", options: ["Điện dung, diện tích bản tụ, khoảng cách giữa hai bản", "Khối lượng, vận tốc, gia tốc", "Áp suất, thể tích, nhiệt độ", "Tần số, bước sóng, cường độ"], answer: 0 },
  { id: "g3", at: 320, prompt: "Khi tăng điện áp nguồn, điện tích trên bản tụ thay đổi thế nào?", options: ["Tăng", "Giảm", "Không đổi", "Về 0"], answer: 0 },
  { id: "g4", at: 420, prompt: "Công cụ nào cho phép em quan sát đường sức điện trường trong mô phỏng?", options: ["Công cụ điện trường (Field)", "Vôn kế", "Ampe kế", "Nhiệt kế"], answer: 0 },
  { id: "g5", at: 520, prompt: "Khi đảo hai đầu đo vôn kế, điều gì xảy ra với dấu của hiệu điện thế đo được?", options: ["Đổi dấu", "Không đổi", "Về 0", "Không xác định"], answer: 0 },
];
