-- =============================================
-- COMPLETE MIGRATION: All Missing Tables & Policies
-- Run this ONCE in Supabase SQL Editor
-- =============================================
-- This script safely adds only what's missing without breaking existing setup

-- =============================================
-- 1. GROUP_LEADERS TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS group_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_group_leader UNIQUE (group_id, leader_id),
  CONSTRAINT valid_leader CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = leader_id 
      AND profiles.role IN ('leader', 'admin')
    )
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_leaders_group ON group_leaders(group_id);
CREATE INDEX IF NOT EXISTS idx_group_leaders_leader ON group_leaders(leader_id);

-- Enable RLS
ALTER TABLE group_leaders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. GROUP_LEADERS RLS POLICIES (safe drop & create)
-- =============================================
DROP POLICY IF EXISTS "Anyone can view group leaders" ON group_leaders;
CREATE POLICY "Anyone can view group leaders"
  ON group_leaders FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Leaders can insert as group leaders" ON group_leaders;
CREATE POLICY "Leaders can insert as group leaders"
  ON group_leaders FOR INSERT
  WITH CHECK (
    auth.uid() = leader_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('leader', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can insert any group leader" ON group_leaders;
CREATE POLICY "Admins can insert any group leader"
  ON group_leaders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Leaders can remove themselves" ON group_leaders;
CREATE POLICY "Leaders can remove themselves"
  ON group_leaders FOR DELETE
  USING (auth.uid() = leader_id);

DROP POLICY IF EXISTS "Admins can delete any group leader" ON group_leaders;
CREATE POLICY "Admins can delete any group leader"
  ON group_leaders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =============================================
-- 3. FIX EXISTING GROUPS POLICIES (drop & recreate safely)
-- =============================================
DROP POLICY IF EXISTS "Anyone can view groups" ON groups;
CREATE POLICY "Anyone can view groups"
  ON groups FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert groups" ON groups;
CREATE POLICY "Admins can insert groups"
  ON groups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update groups" ON groups;
CREATE POLICY "Admins can update groups"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete groups" ON groups;
CREATE POLICY "Admins can delete groups"
  ON groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =============================================
-- 4. STORAGE BUCKET (safe creation)
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('devotions', 'devotions', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. STORAGE POLICIES (safe drop & create)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can upload devotions" ON storage.objects;
CREATE POLICY "Authenticated users can upload devotions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'devotions'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Anyone can view devotion images" ON storage.objects;
CREATE POLICY "Anyone can view devotion images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'devotions');

DROP POLICY IF EXISTS "Users can update own devotion images" ON storage.objects;
CREATE POLICY "Users can update own devotion images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'devotions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own devotion images" ON storage.objects;
CREATE POLICY "Users can delete own devotion images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'devotions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- 6. AUTO-POPULATE GROUP_LEADERS (for existing data)
-- =============================================
-- If you have leaders assigned to groups, add them to group_leaders
INSERT INTO group_leaders (group_id, leader_id)
SELECT DISTINCT
  p.group_id,
  p.id
FROM profiles p
WHERE p.role IN ('leader', 'admin')
  AND p.group_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM group_leaders gl
    WHERE gl.group_id = p.group_id AND gl.leader_id = p.id
  );

-- =============================================
-- VERIFICATION QUERIES (uncomment to check)
-- =============================================
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- SELECT * FROM storage.buckets WHERE id = 'devotions';
-- SELECT * FROM group_leaders;
