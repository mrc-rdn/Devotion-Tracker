-- Add content column to devotions table for rich-text devotion entries
-- This allows users to write digital devotions instead of just uploading images

ALTER TABLE devotions
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add a check constraint to ensure at least one content type exists
-- (either image_url OR content must be present)
ALTER TABLE devotions
ADD CONSTRAINT devotion_has_content CHECK (
  image_url IS NOT NULL OR content IS NOT NULL
);
