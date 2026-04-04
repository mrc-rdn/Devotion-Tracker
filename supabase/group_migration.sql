-- =============================================
-- GROUP FUNCTIONALITY MIGRATION
-- Run this in Supabase SQL Editor AFTER schema.sql
-- Idempotent: safe to run multiple times
-- =============================================

-- =============================================
-- 0. NUCLEAR OPTION: Drop ALL policies on affected tables
-- =============================================
-- This ensures a clean slate even if migration failed halfway before

-- Drop ALL profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view same-group profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON profiles;

-- Drop ALL group policies
DROP POLICY IF EXISTS "Anyone can view groups" ON groups;
DROP POLICY IF EXISTS "Admins can insert groups" ON groups;
DROP POLICY IF EXISTS "Admins can update groups" ON groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON groups;
DROP POLICY IF EXISTS "Leaders and admins can create groups" ON groups;
DROP POLICY IF EXISTS "Leaders and admins can update groups" ON groups;

-- Drop ALL devotion policies
DROP POLICY IF EXISTS "Users can view own devotions" ON devotions;
DROP POLICY IF EXISTS "Users can insert own devotions" ON devotions;
DROP POLICY IF EXISTS "Leaders can insert own devotions" ON devotions;
DROP POLICY IF EXISTS "Leaders can view group devotions" ON devotions;
DROP POLICY IF EXISTS "Admins can view all devotions" ON devotions;
DROP POLICY IF EXISTS "Users can update own devotions" ON devotions;
DROP POLICY IF EXISTS "Admins can update any devotion" ON devotions;
DROP POLICY IF EXISTS "Users can delete own devotions" ON devotions;
DROP POLICY IF EXISTS "Admins can delete any devotion" ON devotions;

-- NOTE: group_leaders policy drops moved to after table creation (section 3)

-- =============================================
-- 1. ADD UNIQUE CONSTRAINT TO GROUPS.NAME
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_name_unique'
  ) THEN
    ALTER TABLE groups ADD CONSTRAINT groups_name_unique UNIQUE (name);
  END IF;
END $$;

-- =============================================
-- 2. GROUP_LEADERS JUNCTION TABLE (multi-leader support)
-- =============================================
CREATE TABLE IF NOT EXISTS group_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate leader assignments
  CONSTRAINT unique_group_leader UNIQUE (group_id, leader_id)
);

CREATE INDEX IF NOT EXISTS idx_group_leaders_group ON group_leaders(group_id);
CREATE INDEX IF NOT EXISTS idx_group_leaders_leader ON group_leaders(leader_id);

-- =============================================
-- 3. RLS FOR GROUP_LEADERS
-- =============================================
ALTER TABLE group_leaders ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. HELPER FUNCTION (SECURITY DEFINER — breaks recursion)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_auth_user_info()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'role', p.role,
    'group_id', p.group_id
  ) INTO v_result
  FROM profiles p
  WHERE p.id = auth.uid();

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. FIXED PROFILES POLICIES
-- =============================================
CREATE POLICY "Users can view same-group profiles"
  ON profiles FOR SELECT
  USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Same group (use helper to avoid recursion)
    (
      group_id IS NOT NULL
      AND group_id = (public.get_auth_user_info() ->> 'group_id')::UUID
    )
    OR
    -- Admin
    (public.get_auth_user_info() ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING ((public.get_auth_user_info() ->> 'role') = 'admin');

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING ((public.get_auth_user_info() ->> 'role') = 'admin');

CREATE POLICY "Admins can delete any profile"
  ON profiles FOR DELETE
  USING ((public.get_auth_user_info() ->> 'role') = 'admin');

-- =============================================
-- 6. FIXED GROUPS POLICIES (leaders can create + manage their groups)
-- =============================================
-- Everyone can view groups (for search/join)
CREATE POLICY "Anyone can view groups"
  ON groups FOR SELECT
  USING (true);

-- Leaders and admins can create groups
CREATE POLICY "Leaders and admins can create groups"
  ON groups FOR INSERT
  WITH CHECK (
    (public.get_auth_user_info() ->> 'role') IN ('leader', 'admin')
  );

-- Group leaders or admins can update groups
CREATE POLICY "Leaders and admins can update groups"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_leaders gl
      WHERE gl.group_id = groups.id AND gl.leader_id = auth.uid()
    )
    OR
    (public.get_auth_user_info() ->> 'role') = 'admin'
  );

-- Only admins can delete groups
CREATE POLICY "Admins can delete groups"
  ON groups FOR DELETE
  USING ((public.get_auth_user_info() ->> 'role') = 'admin');

-- =============================================
-- 7. FIXED DEVOTIONS POLICIES
-- =============================================
-- Members can view own devotions
CREATE POLICY "Users can view own devotions"
  ON devotions FOR SELECT
  USING (auth.uid() = user_id);

-- Leaders can view devotions of groups they lead
CREATE POLICY "Leaders can view group devotions"
  ON devotions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_leaders gl
      WHERE gl.group_id = devotions.group_id AND gl.leader_id = auth.uid()
    )
  );

-- Admins can view all devotions
CREATE POLICY "Admins can view all devotions"
  ON devotions FOR SELECT
  USING ((public.get_auth_user_info() ->> 'role') = 'admin');

-- Members can insert own devotions
CREATE POLICY "Users can insert own devotions"
  ON devotions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND group_id = (public.get_auth_user_info() ->> 'group_id')::UUID
  );

-- Leaders can insert own devotions
CREATE POLICY "Leaders can insert own devotions"
  ON devotions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM group_leaders gl
        WHERE gl.group_id = devotions.group_id AND gl.leader_id = auth.uid()
      )
    )
  );

-- Users can update own devotions
CREATE POLICY "Users can update own devotions"
  ON devotions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update any devotion
CREATE POLICY "Admins can update any devotion"
  ON devotions FOR UPDATE
  USING ((public.get_auth_user_info() ->> 'role') = 'admin');

-- Users can delete own devotions
CREATE POLICY "Users can delete own devotions"
  ON devotions FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can delete any devotion
CREATE POLICY "Admins can delete any devotion"
  ON devotions FOR DELETE
  USING ((public.get_auth_user_info() ->> 'role') = 'admin');

-- =============================================
-- 8. GROUP_LEADERS RLS POLICIES
-- =============================================
-- Anyone can view group leaders (members need to see who leads them)
CREATE POLICY "Anyone can view group leaders"
  ON group_leaders FOR SELECT
  USING (true);

-- Leaders can insert co-leaders
CREATE POLICY "Leaders can insert co-leaders"
  ON group_leaders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_leaders gl
      WHERE gl.leader_id = auth.uid() AND gl.group_id = group_leaders.group_id
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Leaders can remove co-leaders from their groups
CREATE POLICY "Leaders can delete co-leaders"
  ON group_leaders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_leaders gl
      WHERE gl.leader_id = auth.uid() AND gl.group_id = group_leaders.group_id
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 9. AUTOMATICALLY ASSIGN LEADER TO GROUP ON CREATION
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_assign_group_leader()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign leader when inserted by an authenticated user (not from SQL scripts)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.group_leaders (group_id, leader_id)
    VALUES (NEW.id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_group_created ON groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_group_leader();

-- =============================================
-- 10. UPDATE DEVOTION SUBMISSION (server-time enforced)
-- =============================================
CREATE OR REPLACE FUNCTION public.submit_devotion(
  p_user_id UUID,
  p_group_id UUID,
  p_image_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS devotions AS $$
DECLARE
  v_devotion devotions;
  v_server_date DATE;
BEGIN
  v_server_date := public.get_server_date();

  INSERT INTO devotions (user_id, group_id, devotion_date, image_url, notes)
  VALUES (p_user_id, p_group_id, v_server_date, p_image_url, p_notes)
  RETURNING * INTO v_devotion;

  RETURN v_devotion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SEED DATA (safe to run multiple times)
-- =============================================
DELETE FROM group_leaders;
DELETE FROM devotions;
DELETE FROM groups WHERE id IN ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'c3333333-3333-3333-3333-333333333333');

INSERT INTO groups (id, name, description) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Morning Glory Group', 'Early morning devotion group'),
  ('b2222222-2222-2222-2222-222222222222', 'Faith Walkers Group', 'Daily faith journey group'),
  ('c3333333-3333-3333-3333-333333333333', 'Grace Community Group', 'Community-focused devotions')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
