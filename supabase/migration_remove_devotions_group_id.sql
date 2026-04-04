-- =============================================
-- MIGRATION: Remove group_id from devotions table
-- Run this in Supabase SQL Editor ONCE
-- =============================================

-- Step 1: Drop dependent RLS policies
DROP POLICY IF EXISTS "Leaders can view group devotions" ON devotions;
DROP POLICY IF EXISTS "Users can insert own devotions" ON devotions;
DROP POLICY IF EXISTS "Leaders can insert own devotions" ON devotions;
DROP POLICY IF EXISTS "devotions_select" ON devotions;
DROP POLICY IF EXISTS "devotions_insert" ON devotions;
DROP POLICY IF EXISTS "devotions_select_policy" ON devotions;
DROP POLICY IF EXISTS "devotions_insert_policy" ON devotions;

-- Step 2: Drop the submit_devotion function (will recreate without p_group_id)
DROP FUNCTION IF EXISTS public.submit_devotion(UUID, UUID, TEXT, TEXT);

-- Step 3: Remove group_id column from devotions
ALTER TABLE devotions DROP COLUMN IF EXISTS group_id;

-- Drop the index on group_id (no longer needed)
DROP INDEX IF EXISTS idx_devotions_group_date;

-- Step 4: Recreate RLS policies using joins through group_members
-- Leaders can see devotions of users in their groups
CREATE POLICY "devotions_select" ON devotions FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM group_members gm
    JOIN group_members user_gm ON gm.group_id = user_gm.group_id
    WHERE gm.user_id = auth.uid()
      AND gm.role = 'leader'
      AND user_gm.user_id = devotions.user_id
  )
  OR auth_is_admin()
);

-- Users can insert their own devotions (must be in at least one group)
CREATE POLICY "devotions_insert" ON devotions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.user_id = auth.uid()
  )
);

-- Users can update their own devotions
CREATE POLICY "devotions_update" ON devotions FOR UPDATE
USING (auth.uid() = user_id OR auth_is_admin());

-- Users can delete their own devotions
CREATE POLICY "devotions_delete" ON devotions FOR DELETE
USING (auth.uid() = user_id OR auth_is_admin());

-- Step 5: Recreate submit_devotion function without p_group_id
CREATE OR REPLACE FUNCTION public.submit_devotion(
  p_user_id UUID,
  p_image_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS devotions AS $$
DECLARE
  v_devotion devotions;
  v_server_date DATE;
BEGIN
  -- Get server date (source of truth) - uses Philippines timezone
  v_server_date := (NOW() AT TIME ZONE 'Asia/Manila')::DATE;

  -- Insert devotion with server date (no group_id needed)
  INSERT INTO devotions (user_id, devotion_date, image_url, notes)
  VALUES (p_user_id, v_server_date, p_image_url, p_notes)
  RETURNING * INTO v_devotion;

  RETURN v_devotion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create helper view for fetching devotions with group info
CREATE OR REPLACE VIEW devotions_with_groups AS
SELECT
  d.id,
  d.user_id,
  d.devotion_date,
  d.image_url,
  d.notes,
  d.created_at,
  p.first_name,
  p.last_name,
  p.email,
  gm.group_id,
  g.name as group_name
FROM devotions d
JOIN profiles p ON p.id = d.user_id
LEFT JOIN group_members gm ON gm.user_id = d.user_id
LEFT JOIN groups g ON g.id = gm.group_id;

-- Step 7: Verification
SELECT 'SUCCESS: group_id removed from devotions table!' as result;
