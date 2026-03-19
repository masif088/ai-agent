-- Storage bucket for company logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow authenticated users to upload logos
DROP POLICY IF EXISTS "Allow authenticated upload company-logos" ON storage.objects;
CREATE POLICY "Allow authenticated upload company-logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Allow public read
DROP POLICY IF EXISTS "Allow public read company-logos" ON storage.objects;
CREATE POLICY "Allow public read company-logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow authenticated update (for replace)
DROP POLICY IF EXISTS "Allow authenticated update company-logos" ON storage.objects;
CREATE POLICY "Allow authenticated update company-logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');
