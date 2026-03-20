-- Add template_images to templates: JSONB array of {url, label}
ALTER TABLE templates ADD COLUMN IF NOT EXISTS template_images JSONB DEFAULT '[]'::jsonb;
