-- Add logo_url to companies for uploaded logo
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
