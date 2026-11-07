export const HD1_CHECKPOINTS = [
  { time: 5, question: "Sau khi ngắt nguồn, điều gì xảy ra khi nối tụ với LED?", options: ["LED không sáng", "LED sáng ngắn rồi tắt", "LED sáng liên tục", "Chưa xác định"] },
  { time: 10, question: "Năng lượng làm LED sáng đến từ đâu?", options: ["Nguồn điện vẫn cấp", "Tụ đã tích trữ trước đó", "LED tự sinh", "Không rõ"] },
];
export const HD12_QUESTIONS = [
  { id: "G1", question: "Tụ điện gồm hai vật dẫn ngăn cách bởi gì?", options: ["Dây dẫn", "Điện môi", "Điện trở", "Cuộn dây"], hint: "Hãy chú ý đến lớp vật liệu nằm giữa hai bản dẫn." },
  { id: "G2", question: "Đơn vị SI của điện dung là gì?", options: ["Vôn (V)", "Culông (C)", "Fara (F)", "Jun (J)"], hint: "Đơn vị này đặt theo tên nhà khoa học nghiên cứu điện tích." },
  { id: "G3", question: "Công thức liên hệ Q, U, C là:", options: ["Q = C/U", "Q = CU", "Q = U/C", "Q = C + U"], hint: "Điện dung là tỉ số giữa điện tích và hiệu điện thế." },
  { id: "G4", question: "Đồ thị Q=f(U) có slope bằng gì?", options: ["C", "1/C", "W", "R"], hint: "Hệ số góc của Q theo U chính là điện dung." },
  { id: "G5", question: "Đồ thị U=f(Q) có slope bằng gì?", options: ["C", "1/C", "W", "R"], hint: "Đây là hàm nghịch đảo của Q=f(U)." },
  { id: "G6", question: "Tăng diện tích S thì C thay đổi thế nào?", options: ["Tăng", "Giảm", "Không đổi", "Về 0"], hint: "Diện tích bản tụ nằm ở tử số trong công thức C." },
  { id: "G7", question: "Tăng khoảng cách d thì C thay đổi thế nào?", options: ["Tăng", "Giảm", "Không đổi", "Về 0"], hint: "Khoảng cách d nằm ở mẫu số trong công thức C." },
  { id: "G8", question: "Tăng epsilon_r (hằng số điện môi) thì C thay đổi thế nào?", options: ["Tăng", "Giảm", "Không đổi", "Về 0"], hint: "Điện môi có hằng số điện môi tương đối lớn hơn nước? Hãy nghĩ đến vai trò của chất điện môi." },
  { id: "G9", question: "Tụ đã ngắt nguồn thì Q thay đổi thế nào (mô hình lí tưởng)?", options: ["Về 0", "Không đổi", "Tăng vô hạn", "Đổi dấu"], hint: "Không có nguồn cung cấp thêm điện tích; mô hình lí tưởng bỏ qua rò điện." },
  { id: "G10", question: "Tụ còn nối nguồn thì U thay đổi thế nào khi C thay đổi?", options: ["Bằng U nguồn, không đổi", "Tăng", "Giảm", "Về 0"], hint: "Nguồn điện giữ hiệu điện thế cố định giữa hai đầu tụ." },
  { id: "G11", question: "Ghép nối tiếp: đại lượng nào bằng nhau trên các tụ?", options: ["Hiệu điện thế", "Điện tích", "Điện dung", "Năng lượng"], hint: "Trong mạch nối tiếp, cùng một điện tích tích trên mỗi tụ." },
  { id: "G12", question: "Ghép song song: đại lượng nào bằng nhau trên các tụ?", options: ["Hiệu điện thế", "Điện tích", "Điện dung", "Năng lượng"], hint: "Các tụ song song nối chung hai đầu với nhau." },
  { id: "G13", question: "Ceq của ghép song song tính thế nào?", options: ["Tổng các C", "Nghịch đảo tổng nghịch đảo", "Hiệu các C", "Trung bình"], hint: "Song song, diện tích bản tụ rộng lên tương đương cộng các điện dung." },
  { id: "G14", question: "Ceq của 4μF nối tiếp 6μF bằng?", options: ["10 μF", "2.4 μF", "5 μF", "1.5 μF"], hint: "Dùng công thức nghịch đảo tổng nghịch đảo: 1/C = 1/4 + 1/6." },
  { id: "G15", question: "Năng lượng tụ điện có thể viết bằng công thức nào?", options: ["W = CU", "W = ½CU²", "W = Q²C", "W = C/U"], hint: "Năng lượng điện trường tỉ lệ với bình phương hiệu điện thế." },
  { id: "G16", question: "Tụ trong flash máy ảnh có vai trò gì?", options: ["Chỉ dẫn điện", "Tích trữ và giải phóng năng lượng nhanh", "Hạ nhiệt", "Tăng điện trở"], hint: "Flash cần một nguồn năng lượng lớn trong thời gian rất ngắn." },
];
export const HD6_PREQUIZ = [
  { id: "R1", question: "Tụ điện cơ bản gồm gì?", options: ["Một vật dẫn", "Hai vật dẫn ngăn cách bởi điện môi", "Một nguồn và tải", "Một cuộn dây"] },
  { id: "R2", question: "Sau khi ngắt nguồn, Q của tụ lí tưởng sẽ:", options: ["Về 0", "Giữ gần như không đổi", "Tăng vô hạn", "Đổi dấu"] },
  { id: "R3", question: "Với cùng một tụ, nếu U tăng 2 lần thì Q:", options: ["Tăng 2 lần", "Giảm 2 lần", "Không đổi", "Không xác định"] },
  { id: "R4", question: "Trên đồ thị Q=f(U), hệ số góc biểu thị:", options: ["C", "1/C", "W", "R"] },
  { id: "R5", question: "Tăng S, giữ d và điện môi, C sẽ:", options: ["Tăng", "Giảm", "Không đổi", "Về 0"] },
  { id: "R6", question: "Tăng khoảng cách d, giữ S và điện môi, C sẽ:", options: ["Tăng", "Giảm", "Không đổi", "Tăng rồi giảm"] },
  { id: "R7", question: "Hai tụ nối tiếp lí tưởng có đại lượng nào bằng nhau về độ lớn?", options: ["Hiệu điện thế", "Điện tích", "Điện dung", "Năng lượng"] },
  { id: "R8", question: "Hai tụ mắc song song có đặc điểm nào?", options: ["Cùng hiệu điện thế", "Cùng điện tích bắt buộc", "Ceq nhỏ hơn cả hai", "Không có quan hệ"] },
  { id: "R9", question: "Đơn vị SI của điện dung C là:", options: ["J", "C", "F", "V"] },
  { id: "R10", question: "Công thức năng lượng tụ điện phù hợp là:", options: ["W = 1/2 CU²", "W = CU", "W = Q/U", "W = U/Q"] },
];
export const HD7_PEER = [
  { id: "PI1", question: "Cùng một tụ điện, tăng U gấp đôi thì C sẽ:", options: ["Tăng gấp đôi", "Giảm một nửa", "Không đổi", "Không xác định"] },
  { id: "PI2", question: "Tụ đã nạp rồi ngắt nguồn. Tăng d thì đại lượng nào không đổi?", options: ["U", "Q", "C", "W"] },
  { id: "PI3", question: "Hai đường Q=f(U) của C1, C2. C1 dốc hơn. Kết luận?", options: ["C1 > C2", "C1 < C2", "C1 = C2", "Không liên quan"] },
];
