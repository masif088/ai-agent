-- Storage bucket and policies for generated-images
-- Ensures authenticated users can upload, public can read

-- Create bucket if not exists (run via Dashboard if this fails)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to INSERT (upload)
DROP POLICY IF EXISTS "Allow authenticated upload generated-images" ON storage.objects;
CREATE POLICY "Allow authenticated upload generated-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-images');

-- Allow public to SELECT (read) - for public bucket
DROP POLICY IF EXISTS "Allow public read generated-images" ON storage.objects;
CREATE POLICY "Allow public read generated-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generated-images');

-- Allow authenticated to UPDATE (for upsert)
DROP POLICY IF EXISTS "Allow authenticated update generated-images" ON storage.objects;
CREATE POLICY "Allow authenticated update generated-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-images')
WITH CHECK (bucket_id = 'generated-images');
