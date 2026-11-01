-- Add common mobile image, Mac/iWork, LibreOffice, archive, audio and video types
-- while preserving the existing private bucket settings and size limit.
UPDATE storage.buckets AS bucket
SET allowed_mime_types = ARRAY(
  SELECT DISTINCT mime_type
  FROM unnest(bucket.allowed_mime_types || ARRAY[
    'application/rtf', 'text/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.graphics',
    'application/vnd.apple.pages', 'application/vnd.apple.numbers', 'application/vnd.apple.keynote',
    'application/vnd.rar', 'application/x-rar-compressed', 'application/x-7z-compressed',
    'image/heic', 'image/heif', 'image/tiff',
    'audio/aac', 'audio/ogg', 'video/quicktime',
    'text/markdown', 'application/json', 'application/xml', 'text/xml'
  ]::TEXT[]) AS allowed(mime_type)
  ORDER BY mime_type
)
WHERE bucket.id = 'class-work'
  AND bucket.allowed_mime_types IS NOT NULL;