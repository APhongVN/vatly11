const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  const activities = [
    { id: 1, title: 'Bài 1: Trạng thái cân bằng của thanh cứng', description: 'Học về điều kiện cân bằng của thanh cứng.', status: 'available' },
    { id: 2, title: 'Bài 2: Lực momen tác dụng lên thanh cứng', description: 'Tính momen lực và điều kiện cân bằng.', status: 'available' },
    { id: 3, title: 'Bài 3: Thanh cứng tự do, đòn bẩy', description: 'Các loại đòn bẩy và ứng dụng.', status: 'available' },
    { id: 4, title: 'Bài 4: Cân bằng của vật rắn', description: 'Phân tích lực và momen lực.', status: 'available' },
    { id: 5, title: 'Bài 5: Ma sát và lực cản', description: 'Khái niệm ma sát và công thức tính.', status: 'available' },
    { id: 6, title: 'Bài 6: Chuyển động tròn đều', description: 'Vận tốc góc, gia tốc tâm.', status: 'available' },
    { id: 7, title: 'Bài 7: Lực ly tâm và trọng trường', description: 'Hiện tượng lực ly tâm.', status: 'available' },
    { id: 8, title: 'Bài 8: Vật rắn quay quanh trục', description: 'Momen quán tính.', status: 'available' },
    { id: 9, title: 'Bài 9: Động lực học vật rắn', description: 'Phương trình động lực học.', status: 'available' },
    { id: 10, title: 'Bài 10: Năng lượng và công của vật rắn', description: 'Công và năng lượng trong chuyển động quay.', status: 'available' },
    { id: 11, title: 'Bài 11: Dao động điều hòa', description: 'Phương trình dao động.', status: 'available' },
    { id: 12, title: 'Bài 12: Sóng âm và âm thanh', description: 'Tần số, bước sóng.', status: 'available' },
    { id: 13, title: 'Bài 13: Sóng ánh sáng', description: 'Hiện tượng phản xạ, refraction.', status: 'available' },
    { id: 14, title: 'Bài 14: Thấu kính và kính sát', description: 'Công thức thấu kính.', status: 'available' },
  ];
  await supabase.from('activities').upsert(activities);

  const students = [
    { full_name: 'Nguyễn Văn A', class_name: '11A1' },
    { full_name: 'Trần Thị B', class_name: '11A1' },
    { full_name: 'Lê Văn C', class_name: '11A1' },
    { full_name: 'Phạm Thị D', class_name: '11A1' },
    { full_name: 'Hoàng Văn E', class_name: '11A1' },
    { full_name: 'Ngô Thị F', class_name: '11A1' },
    { full_name: 'Đặng Văn G', class_name: '11A1' },
    { full_name: 'Vũ Thị H', class_name: '11A1' },
    { full_name: 'Bùi Văn I', class_name: '11A1' },
    { full_name: 'Đỗ Thị J', class_name: '11A1' },
  ];
  await supabase.from('students').insert(students);
  console.log('Seed done');
})();