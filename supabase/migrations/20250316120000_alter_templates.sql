-- Alter templates: add company_id, template_content; remove suffix, prefix
-- Step 1: Add company_id (nullable first for existing rows, then we can backfill or leave as optional)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Step 2: Add template_content
ALTER TABLE templates ADD COLUMN IF NOT EXISTS template_content TEXT;

-- Step 3: Drop suffix and prefix
ALTER TABLE templates DROP COLUMN IF EXISTS suffix;
ALTER TABLE templates DROP COLUMN IF EXISTS prefix;

-- Index for company_id
CREATE INDEX IF NOT EXISTS idx_templates_company_id ON templates(company_id);
