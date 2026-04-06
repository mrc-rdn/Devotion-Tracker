-- =============================================
-- FIX: Add 'owner' role to group_members
-- =============================================
-- This migration fixes the group creator role:
-- 1. Adds 'owner' to the role CHECK constraint
-- 2. Adds owner_id to groups table
-- 3. Fixes RLS INSERT policy to allow self-insert as 'owner'
-- 4. Migrates existing group creators to 'owner' role
-- =============================================

-- Step 1: Add owner_id column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- Step 2: Drop existing CHECK constraint on group_members.role
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_role_check;

-- Step 3: Add new CHECK constraint with 'owner' included
ALTER TABLE group_members ADD CONSTRAINT group_members_role_check 
  CHECK (role IN ('owner', 'leader', 'member'));

-- Step 4: Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can join groups as member" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;

-- Step 5: Create new INSERT policy that allows self-insert as 'owner'
CREATE POLICY "Users can manage group memberships"
ON group_members FOR INSERT
WITH CHECK (
  -- User can join as member
  (user_id = auth.uid() AND role = 'member')
  OR
  -- User can create group and assign themselves as owner (owner_id must match)
  (user_id = auth.uid() AND role = 'owner' AND EXISTS (
    SELECT 1 FROM groups g WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
  ))
  OR
  -- Owner/leader of the group can add anyone
  (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = group_members.group_id
        AND gm.role IN ('leader', 'owner')
    )
  )
);

-- Step 6: Migrate existing group creators (profiles.group_id) to 'owner' role
-- If a user created a group (owner_id is set), make sure they have 'owner' role
UPDATE group_members
SET role = 'owner'
WHERE role = 'leader'
  AND EXISTS (
    SELECT 1 FROM groups g 
    WHERE g.id = group_members.group_id 
      AND g.owner_id = group_members.user_id
  );

-- Step 7: Add UPDATE policy for owners and leaders
DROP POLICY IF EXISTS "Owners and leaders can update member roles" ON group_members;
CREATE POLICY "Owners and leaders can update member roles"
ON group_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.group_id = group_members.group_id
      AND gm.role IN ('leader', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.group_id = group_members.group_id
      AND gm.role IN ('leader', 'owner')
  )
);

-- Step 8: Add DELETE policy fix
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups"
ON group_members FOR DELETE
USING (
  -- User can remove themselves (except owners)
  (user_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.user_id = auth.uid() 
      AND gm.group_id = group_members.group_id 
      AND gm.role = 'owner'
  ))
  OR
  -- Owner can remove anyone
  (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = group_members.group_id
        AND gm.role = 'owner'
    )
  )
  OR
  -- Leader can remove members (but not other leaders/owners)
  (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = group_members.group_id
        AND gm.role = 'leader'
    )
    AND
    NOT EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.user_id = group_members.user_id
        AND gm2.group_id = group_members.group_id
        AND gm2.role IN ('leader', 'owner')
    )
  )
);
