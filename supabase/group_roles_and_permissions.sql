-- ============================================
-- GROUP ROLES & PERMISSIONS UPDATE
-- ============================================
-- This migration implements:
-- 1. Multiple leaders per group (co-leaders)
-- 2. Group owner tracking
-- 3. Role-based access control for devotions
-- 4. Promotion system (member → co-leader)
-- ============================================

-- Step 1: Add owner_id to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- Set existing groups' owner to their first leader
UPDATE groups g
SET owner_id = (
  SELECT gm.user_id 
  FROM group_members gm 
  WHERE gm.group_id = g.id 
    AND gm.role = 'leader' 
  LIMIT 1
)
WHERE g.owner_id IS NULL;

-- Step 2: Drop old unique constraint if it exists (allows multiple leaders)
-- The original constraint likely was: UNIQUE(group_id, user_id)
-- We need to keep this to prevent duplicate memberships, but allow role changes
-- Actually, the issue is likely the RLS policy, not the constraint
-- Let's verify the constraint allows role updates

-- Step 3: Drop old RLS policies for group_members
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can insert into group_members" ON group_members;
DROP POLICY IF EXISTS "Users can update group_members" ON group_members;
DROP POLICY IF EXISTS "Users can delete from group_members" ON group_members;
DROP POLICY IF EXISTS "Leaders can manage group members" ON group_members;
DROP POLICY IF EXISTS "Members can join groups" ON group_members;

-- Step 4: Create new RLS policies for group_members

-- SELECT: Users can see members of groups they belong to
CREATE POLICY "Users can view group members"
ON group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.group_id = group_members.group_id
  )
);

-- INSERT: Users can join groups as members, leaders/owners can add members/leaders
CREATE POLICY "Users can join groups as member"
ON group_members FOR INSERT
WITH CHECK (
  -- User can join as member
  (user_id = auth.uid() AND role = 'member')
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

-- UPDATE: Only owner/leader of the group can update roles (promotions)
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

-- DELETE: Users can leave groups, owners/leaders can remove members
CREATE POLICY "Users can leave groups"
ON group_members FOR DELETE
USING (
  -- User can remove themselves
  user_id = auth.uid()
  OR
  -- Owner/leader can remove members (but not other owners/leaders)
  (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = group_members.group_id
        AND gm.role IN ('leader', 'owner')
    )
    AND
    -- Cannot remove other owners or leaders
    NOT EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.user_id = group_members.user_id
        AND gm2.group_id = group_members.group_id
        AND gm2.role IN ('leader', 'owner')
    )
  )
);

-- Step 5: Update groups RLS policies

-- Drop old policies
DROP POLICY IF EXISTS "Users can view groups" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Owners can update groups" ON groups;
DROP POLICY IF EXISTS "Owners can delete groups" ON groups;

-- SELECT: Users can see groups they belong to
CREATE POLICY "Users can view their groups"
ON groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = groups.id
      AND gm.user_id = auth.uid()
  )
  OR
  owner_id = auth.uid()
);

-- INSERT: Any authenticated user can create a group
CREATE POLICY "Users can create groups"
ON groups FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- UPDATE: Only owner can update group details
CREATE POLICY "Owners can update groups"
ON groups FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- DELETE: Only owner can delete group
CREATE POLICY "Owners can delete groups"
ON groups FOR DELETE
USING (owner_id = auth.uid());

-- Step 6: Update devotions RLS for role-based access

-- Drop old devotion policies
DROP POLICY IF EXISTS "Users can view own devotions" ON devotions;
DROP POLICY IF EXISTS "Users can insert own devotions" ON devotions;
DROP POLICY IF EXISTS "Leaders can view group devotions" ON devotions;
DROP POLICY IF EXISTS "Users can update own devotions" ON devotions;
DROP POLICY IF EXISTS "Users can delete own devotions" ON devotions;

-- SELECT: Users can see their own devotions
-- Co-leaders/leaders can see all devotions in their groups
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
        -- Get all groups where the current user is a leader
        SELECT gm2.group_id 
        FROM group_members gm2 
        WHERE gm2.user_id = auth.uid() 
          AND gm2.role IN ('leader', 'owner')
      )
      AND gm.user_id = devotions.user_id
    )
  )
);

-- INSERT: Users can insert their own devotions
CREATE POLICY "Users can insert own devotions"
ON devotions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own devotions
CREATE POLICY "Users can update own devotions"
ON devotions FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own devotions
CREATE POLICY "Users can delete own devotions"
ON devotions FOR DELETE
USING (user_id = auth.uid());

-- Step 7: Add function to check if user can promote in a group
CREATE OR REPLACE FUNCTION can_promote_in_group(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT gm.role INTO v_role
  FROM group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.user_id = p_user_id;
  
  -- Only owners and leaders can promote
  RETURN v_role IN ('owner', 'leader');
END;
$$;

-- Step 8: Add function to get user's role in a specific group
CREATE OR REPLACE FUNCTION get_user_role_in_group(p_group_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT gm.role INTO v_role
  FROM group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.user_id = p_user_id;
  
  RETURN COALESCE(v_role, 'none');
END;
$$;

-- Step 9: Add function to promote member to co-leader
CREATE OR REPLACE FUNCTION promote_to_co_leader(p_group_id UUID, p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Get caller's role
  SELECT gm.role INTO v_caller_role
  FROM group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.user_id = auth.uid();
  
  -- Check if caller has permission to promote
  IF v_caller_role NOT IN ('owner', 'leader') THEN
    RETURN QUERY SELECT FALSE, 'Only owners or leaders can promote members';
    RETURN;
  END IF;
  
  -- Get target's current role
  SELECT gm.role INTO v_target_role
  FROM group_members gm
  WHERE gm.group_id = p_group_id
    AND gm.user_id = p_user_id;
  
  IF v_target_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User is not a member of this group';
    RETURN;
  END IF;
  
  IF v_target_role = 'leader' THEN
    RETURN QUERY SELECT FALSE, 'User is already a leader';
    RETURN;
  END IF;
  
  -- Promote to leader
  UPDATE group_members
  SET role = 'leader'
  WHERE group_id = p_group_id
    AND user_id = p_user_id;
  
  RETURN QUERY SELECT TRUE, 'Successfully promoted to co-leader';
END;
$$;

-- Step 10: Add trigger to set owner_id when creating a group
CREATE OR REPLACE FUNCTION set_group_owner_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_group_owner ON groups;
CREATE TRIGGER trg_set_group_owner
BEFORE INSERT ON groups
FOR EACH ROW
EXECUTE FUNCTION set_group_owner_on_insert();

-- Step 11: Add leader to group automatically when they create it
CREATE OR REPLACE FUNCTION add_creator_as_group_leader()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert the creator as owner/leader
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_creator_as_leader ON groups;
CREATE TRIGGER trg_add_creator_as_leader
AFTER INSERT ON groups
FOR EACH ROW
EXECUTE FUNCTION add_creator_as_group_leader();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION can_promote_in_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_in_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_co_leader(UUID, UUID) TO authenticated;
