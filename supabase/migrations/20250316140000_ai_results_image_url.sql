-- Add result_image_url to ai_results for storing generated image URL
ALTER TABLE ai_results ADD COLUMN IF NOT EXISTS result_image_url TEXT;
