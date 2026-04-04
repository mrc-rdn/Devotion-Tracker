-- =============================================
-- MIGRATION: Remove group_id from profiles, add group_members
-- Run this in Supabase SQL Editor ONCE
-- =============================================

-- Step 1: Create group_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_group_membership UNIQUE (group_id, user_id)
);

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

-- Step 3: Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Migrate existing profiles.group_id to group_members
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT
  group_id,
  id as user_id,
  'member' as role,
  created_at as joined_at
FROM profiles
WHERE group_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Step 5: Migrate existing group_leaders to group_members
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT
  group_id,
  leader_id as user_id,
  'leader' as role,
  created_at as joined_at
FROM group_leaders
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'leader';

-- Step 6: Drop RLS policies that reference profiles.group_id
DROP POLICY IF EXISTS "Users can view same-group profiles" ON profiles;
DROP POLICY IF EXISTS "Leaders can view group devotions" ON devotions;
DROP POLICY IF EXISTS "Users can insert own devotions" ON devotions;
DROP POLICY IF EXISTS "Leaders can insert own devotions" ON devotions;

-- Step 7: Create new RLS policies using group_members
-- Users can view profiles in their groups (avoid recursion by using a separate query)
CREATE POLICY "Users can view same-group profiles"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT gm2.user_id
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Leaders can view devotions in their groups
CREATE POLICY "Leaders can view group devotions"
  ON devotions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.role = 'leader'
        AND gm.group_id = devotions.group_id
    )
  );

-- Members can insert devotions to their groups
CREATE POLICY "Users can insert own devotions"
  ON devotions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = devotions.group_id
    )
  );

-- Leaders can insert devotions to their groups
CREATE POLICY "Leaders can insert own devotions"
  ON devotions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = devotions.group_id
    )
  );

-- Step 8: Add RLS policies for group_members table
DROP POLICY IF EXISTS "Anyone can view group memberships" ON group_members;
CREATE POLICY "Anyone can view group memberships"
  ON group_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join groups" ON group_members;
CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Leaders can remove members from their groups" ON group_members;
CREATE POLICY "Leaders can remove members from their groups"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'leader'
    )
  );

DROP POLICY IF EXISTS "Leaders can add members to their groups" ON group_members;
CREATE POLICY "Leaders can add members to their groups"
  ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'leader'
    )
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Admins can manage all memberships" ON group_members;
CREATE POLICY "Admins can manage all memberships"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Step 9: Create helper view
CREATE OR REPLACE VIEW group_members_with_profiles AS
SELECT
  gm.id,
  gm.group_id,
  gm.user_id,
  gm.role,
  gm.joined_at,
  p.first_name,
  p.last_name,
  p.email,
  p.role as user_role,
  p.avatar_url
FROM group_members gm
JOIN profiles p ON p.id = gm.user_id;

-- Step 10: Create helper functions
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_description TEXT,
  member_role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.description,
    gm.role,
    gm.joined_at
  FROM group_members gm
  JOIN groups g ON g.id = gm.group_id
  WHERE gm.user_id = p_user_id
  ORDER BY gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_group_members(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  member_role TEXT,
  user_role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gm.user_id,
    p.first_name,
    p.last_name,
    p.email,
    gm.role as member_role,
    p.role as user_role,
    gm.joined_at
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id
  ORDER BY
    CASE gm.role WHEN 'leader' THEN 0 ELSE 1 END,
    p.first_name,
    p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Optionally drop the old group_id column from profiles
-- WARNING: This is irreversible. Only run this after confirming migration worked!
-- ALTER TABLE profiles DROP COLUMN IF EXISTS group_id;

-- Step 12: Verification queries (uncomment to check)
-- SELECT COUNT(*) as total_members FROM group_members;
-- SELECT * FROM group_members_with_profiles LIMIT 10;
