-- Add browser-friendly AVIF and BMP images to the private chat upload allowlist.
-- Preserve unlimited buckets configured with a NULL MIME allowlist.
UPDATE storage.buckets AS bucket
SET allowed_mime_types = ARRAY(
  SELECT DISTINCT mime_type
  FROM unnest(bucket.allowed_mime_types || ARRAY['image/avif', 'image/bmp']::TEXT[]) AS allowed(mime_type)
  ORDER BY mime_type
)
WHERE bucket.id = 'class-work'
  AND bucket.allowed_mime_types IS NOT NULL;