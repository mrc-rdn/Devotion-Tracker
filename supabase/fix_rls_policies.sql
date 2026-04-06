-- ============================================
-- FIX RLS POLICIES FOR GROUP CREATION & SEARCH
-- ============================================
-- This fixes the issues where:
-- 1. Leaders cannot create groups (trigger fails).
-- 2. Search returns no results (policy too strict).
-- 3. Members cannot see their own devotions (policy issue).
-- ============================================

-- Step 1: Fix group_members INSERT policy to allow Owner self-insert
-- This allows the trigger that adds the group creator as 'owner' to succeed.

DROP POLICY IF EXISTS "Users can join groups as member" ON group_members;
CREATE POLICY "Users can join groups as member"
ON group_members FOR INSERT
WITH CHECK (
  -- User can join as member
  (user_id = auth.uid() AND role = 'member')
  OR
  -- User can join as owner (for the creator trigger)
  (user_id = auth.uid() AND role = 'owner')
  OR
  -- Leader/owner of the group can add anyone
  (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = group_members.group_id
        AND gm.role IN ('leader', 'owner')
    )
  )
);

-- Step 2: Fix group_members SELECT policy to allow Search to work
-- Users need to see leaders of groups they aren't in yet to search/browse groups.

DROP POLICY IF EXISTS "Users can view group members" ON group_members;
CREATE POLICY "Users can view group members"
ON group_members FOR SELECT
USING (
  -- Member can see all members in their groups
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.group_id = group_members.group_id
  )
  OR
  -- Anyone can see leaders/owners (for search results)
  group_members.role IN ('leader', 'owner')
);

-- Step 3: Ensure Devotions RLS allows self-view correctly
-- This is a safety check to ensure members can see their own devotions.

DROP POLICY IF EXISTS "Users can view devotions" ON devotions;
CREATE POLICY "Users can view devotions"
ON devotions FOR SELECT
USING (
  -- User can always see their own devotions
  user_id = auth.uid()
  OR
  -- Co-leaders/leaders can see all devotions in groups they lead
  (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id IN (
        SELECT gm2.group_id 
        FROM group_members gm2 
        WHERE gm2.user_id = auth.uid() 
          AND gm2.role IN ('leader', 'owner')
      )
      AND gm.user_id = devotions.user_id
    )
  )
);
