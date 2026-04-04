-- =============================================
-- GROUP MEMBERSHIP REDESIGN
-- Supports: Users in multiple groups, Leaders managing multiple groups
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create group_members junction table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate memberships
  CONSTRAINT unique_group_membership UNIQUE (group_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

-- Enable RLS
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. MIGRATE EXISTING DATA
-- =============================================

-- Migrate existing profiles.group_id to group_members
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT 
  group_id,
  id as user_id,
  'member' as role,
  created_at as joined_at
FROM profiles 
WHERE group_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- Migrate existing group_leaders to group_members
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT 
  group_id,
  leader_id as user_id,
  'leader' as role,
  created_at as joined_at
FROM group_leaders
ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'leader';

-- =============================================
-- 3. UPDATE PROFILES TABLE
-- Remove group_id constraint (keep column for backward compatibility)
-- =============================================

-- Add a default_group_id column if needed for backward compatibility
-- We'll keep group_id but it won't be the primary relationship anymore
-- The group_members table is now the source of truth

-- =============================================
-- 4. RLS POLICIES for group_members
-- =============================================

-- Everyone can view group memberships
CREATE POLICY "Anyone can view group memberships"
  ON group_members FOR SELECT 
  USING (true);

-- Users can join groups (authenticated)
CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can leave groups (only their own membership)
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE 
  USING (auth.uid() = user_id);

-- Leaders can remove members from their groups
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

-- Leaders can add members to their groups
CREATE POLICY "Leaders can add members to their groups"
  ON group_members FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'leader'
    )
    OR auth.uid() = user_id -- Users can join themselves
  );

-- Admins can do anything
CREATE POLICY "Admins can manage all memberships"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =============================================
-- 5. UPDATE GROUP_LEADERS RLS (for backward compatibility)
-- =============================================

DROP POLICY IF EXISTS "Anyone can view group leaders" ON group_leaders;
CREATE POLICY "Anyone can view group leaders"
  ON group_leaders FOR SELECT USING (true);

-- =============================================
-- 6. CREATE VIEW for easy member queries
-- =============================================

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

-- =============================================
-- 7. VERIFICATION QUERIES (uncomment to check)
-- =============================================

-- Check migrated data
-- SELECT COUNT(*) as total_members FROM group_members;
-- SELECT COUNT(*) as leaders FROM group_members WHERE role = 'leader';
-- SELECT COUNT(*) as regular_members FROM group_members WHERE role = 'member';

-- Check specific group
-- SELECT * FROM group_members_with_profiles WHERE group_id = 'your-group-id';

-- =============================================
-- 8. HELPER FUNCTIONS
-- =============================================

-- Function to get all groups for a user
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

-- Function to get all members of a group
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
