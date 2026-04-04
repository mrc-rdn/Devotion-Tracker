-- =============================================
-- BIBLE FAVORITES TABLE ONLY
-- Bible text is fetched from bible-api.com (no local storage needed)
-- Run this in Supabase SQL Editor
-- =============================================

-- Favorites Table (users can save favorite verses)
CREATE TABLE IF NOT EXISTS bible_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  text_kjv TEXT NOT NULL,
  text_tagalog TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reference)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bible_favorites_user ON bible_favorites(user_id);

-- Enable RLS
ALTER TABLE bible_favorites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Users can manage their own favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON bible_favorites;
CREATE POLICY "Users can view own favorites"
  ON bible_favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add favorites" ON bible_favorites;
CREATE POLICY "Users can add favorites"
  ON bible_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON bible_favorites;
CREATE POLICY "Users can delete own favorites"
  ON bible_favorites FOR DELETE USING (auth.uid() = user_id);
