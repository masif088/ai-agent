-- Storage bucket for template images (logos, reference images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-images',
  'template-images',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow authenticated upload template-images" ON storage.objects;
CREATE POLICY "Allow authenticated upload template-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'template-images');

DROP POLICY IF EXISTS "Allow public read template-images" ON storage.objects;
CREATE POLICY "Allow public read template-images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'template-images');

DROP POLICY IF EXISTS "Allow authenticated update template-images" ON storage.objects;
CREATE POLICY "Allow authenticated update template-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'template-images')
WITH CHECK (bucket_id = 'template-images');
