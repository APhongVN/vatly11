-- Mục 4 & 9: đảm bảo bucket kho học liệu tồn tại với giới hạn 100 MB và nhận
-- mọi định dạng tệp (docx, pdf, video, ảnh...). Idempotent — chạy lại an toàn.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('learning-resources', 'learning-resources', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600,
  allowed_mime_types = NULL;

-- Đảm bảo bucket bài làm/nộp bài cũng nhận tệp 100 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('class-work', 'class-work', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', FALSE, 104857600, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 104857600;