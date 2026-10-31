-- Seed only curriculum metadata; teachers can add, edit, publish and attach the real materials in the UI.
-- Activity IDs 9, 10 and 11 remain merged into the single experiment activity 8.
INSERT INTO public.courses (id, title, description, grade_level, subject)
VALUES ('11111111-1111-4111-8111-111111111111', 'Vật lí 11', 'Chương trình học Vật lí lớp 11.', 11, 'Vật lí')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.chapters (id, title, description, course_id)
VALUES ('44444444-4444-4444-8444-444444444444', 'Chuyên đề Tụ điện', 'Không gian học tập tổng thể cho chuỗi hoạt động trước, trong và sau giờ học.', '11111111-1111-4111-8111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.activities
  (id, title, description, phase, type, duration, status, deliverable, course_id, chapter_id)
VALUES
  (1,'Xác định vấn đề bài học','Quan sát tình huống tụ điện nạp và phóng điện; nêu dự đoán ban đầu.','Trước lớp','Bài giảng','8–10 phút','locked','Câu hỏi vấn đề và giải thích ban đầu','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (2,'Microteaching – video bài giảng ngắn','Bốn video ngắn: ứng dụng, cấu tạo, điện dung và năng lượng tụ điện.','Trước lớp','Bài giảng','20–25 phút','locked','Bốn video và checkpoint','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (3,'Đề xuất dự đoán và giả thuyết','Nêu giả thuyết về Q–U và ảnh hưởng của S, d, εr đến điện dung.','Trước lớp','Bài tập','10–12 phút','locked','Bốn giả thuyết cá nhân','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (4,'Khám phá bằng phòng thí nghiệm ảo','Khảo sát ảnh hưởng của diện tích, khoảng cách và điện môi; lập đồ thị Q–U.','Trước lớp','Thí nghiệm','30–40 phút','available','Sổ tay điều tra và dữ liệu đo','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (5,'Quan sát và phân tích thí nghiệm thật','Đối chiếu dự đoán với bằng chứng từ thí nghiệm nạp và phóng tụ điện.','Trước lớp','Bài giảng','8–10 phút','locked','Báo cáo Prediction–Evidence–Revision','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (6,'Kiểm tra mức sẵn sàng trước giờ học','Bài kiểm tra ngắn về cấu tạo, điện tích, điện dung, ghép tụ và câu hỏi còn băn khoăn.','Trước lớp','Bài tập','10 phút','locked','Bài kiểm tra 10 câu và Muddy Point','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (7,'Kích hoạt kiến thức và đối chiếu dự đoán','Bình chọn cá nhân, thảo luận theo cặp và đối chiếu câu trả lời.','Trên lớp','Bài tập','10–12 phút','locked','Bình chọn và lập luận sau thảo luận','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (8,'Các thí nghiệm liên quan đến tụ điện','Hoạt động tích hợp: nạp/phóng; điện dung; ghép tụ; năng lượng điện trường.','Trên lớp','Thí nghiệm','60–80 phút','locked','Phiếu học tập thực nghiệm và mô hình hóa','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (12,'Luyện tập – củng cố – vận dụng gần','Thử thách 16 câu và bài tập phân hóa theo bốn mức độ.','Trên lớp','Bài tập','20 phút','locked','Capacitor Challenge và bài tập phân hóa','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (13,'Vận dụng xa và thiết kế dự án','Thiết kế giải pháp tích trữ năng lượng, tính toán và bảo vệ phương án.','Sau lớp','Dự án','1–2 tuần','locked','Báo cáo hoặc poster/video dự án','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444'),
  (14,'Phản tư – luyện tập giãn cách – chuyển giao','Tự đánh giá sự thay đổi nhận thức và làm bài tập chuyển giao sau một tuần.','Sau lớp','Phản tư','15–20 phút + mở trễ','locked','Bốn câu phản tư và tám bài tập','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activity_grading_guides (activity_id, grading_rubric) VALUES
  (1,'Nêu quan sát, giải thích năng lượng tích trữ và đặt câu hỏi nghiên cứu.'),
  (2,'Hoàn thành checkpoint về ứng dụng, cấu tạo, quan hệ Q–U, các yếu tố ảnh hưởng C và năng lượng.'),
  (3,'Đánh giá xu hướng, đồ thị dự kiến và căn cứ vật lí cho Q–U, C–S, C–d, C–εr.'),
  (4,'3đ dữ liệu đo; 4đ đồ thị Q=f(U) và hệ số góc; 3đ kết luận tác động của S, d, εr.'),
  (5,'Nêu bằng chứng quan sát, đối chiếu dự đoán và giải thích phóng điện qua tải.'),
  (6,'Mỗi câu đúng 1 điểm; ghi nhận câu hỏi còn vướng để giáo viên xử lý đầu giờ.'),
  (7,'Đánh giá lập luận ban đầu và sự thay đổi câu trả lời sau khi thảo luận cặp.'),
  (8,'Mỗi nội dung 2.5đ: nạp/phóng; C=ε₀εrS/d; quy tắc ghép; năng lượng W=1/2QU.'),
  (12,'Hoàn thành câu hỏi củng cố và bài phân hóa; phân biệt tụ còn nối nguồn với tụ đã ngắt nguồn.'),
  (13,'Đánh giá kiến thức, tính toán, so sánh phương án, tính khả thi và trình bày sơ đồ.'),
  (14,'Đánh giá phản tư dựa trên bằng chứng và hoàn thành bài chuyển giao sau một tuần.')
ON CONFLICT (activity_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('public.activities','id'), GREATEST(COALESCE((SELECT MAX(id) FROM public.activities), 1), 1), true);
