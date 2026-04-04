-- =============================================
-- ADD GROUP_LEADERS TABLE AND RELATED POLICIES
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create the group_leaders join table
CREATE TABLE IF NOT EXISTS group_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate leader assignments
  CONSTRAINT unique_group_leader UNIQUE (group_id, leader_id),
  -- Prevent self-referencing (though this shouldn't happen with profiles)
  CONSTRAINT valid_leader CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = leader_id 
      AND profiles.role IN ('leader', 'admin')
    )
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_leaders_group ON group_leaders(group_id);
CREATE INDEX IF NOT EXISTS idx_group_leaders_leader ON group_leaders(leader_id);

-- Enable RLS
ALTER TABLE group_leaders ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for group_leaders

-- Anyone can view group leaders
CREATE POLICY "Anyone can view group leaders"
  ON group_leaders FOR SELECT
  USING (true);

-- Leaders can insert themselves (when creating a group)
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

-- Admins can insert any leader
CREATE POLICY "Admins can insert any group leader"
  ON group_leaders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Leaders can remove themselves
CREATE POLICY "Leaders can remove themselves"
  ON group_leaders FOR DELETE
  USING (auth.uid() = leader_id);

-- Admins can remove any leader
CREATE POLICY "Admins can delete any group leader"
  ON group_leaders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. Function to automatically add leader when creating a group
CREATE OR REPLACE FUNCTION public.handle_group_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add if the creator is a leader or admin
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('leader', 'admin')
  ) THEN
    INSERT INTO group_leaders (group_id, leader_id)
    VALUES (NEW.id, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger on groups table
DROP TRIGGER IF EXISTS on_group_created ON groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_group_creation();

-- 5. Add existing leaders to group_leaders (if you have seed data)
-- This handles the seed data from your schema.sql
INSERT INTO group_leaders (group_id, leader_id)
SELECT 
  g.id,
  p.id
FROM groups g
CROSS JOIN profiles p
WHERE p.role IN ('leader', 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM group_leaders gl 
    WHERE gl.group_id = g.id AND gl.leader_id = p.id
  );
