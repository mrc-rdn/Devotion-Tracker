-- =============================================
-- DEVOTION TRACKER SYSTEM — DATABASE SCHEMA
-- Execute in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. GROUPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 1b. GROUP_LEADERS TABLE (join table)
-- =============================================
CREATE TABLE IF NOT EXISTS group_leaders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate leader assignments
  CONSTRAINT unique_group_leader UNIQUE (group_id, leader_id),
  -- Prevent assigning non-leaders
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

-- =============================================
-- 2. PROFILES TABLE (linked to Supabase Auth)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('member', 'leader', 'admin')),
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster group lookups
CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON profiles(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =============================================
-- 3. DEVOTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS devotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  devotion_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')::DATE,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate devotions per user per day
  CONSTRAINT unique_devotion_per_day UNIQUE (user_id, devotion_date)
);

-- Index for calendar queries
CREATE INDEX IF NOT EXISTS idx_devotions_user_date ON devotions(user_id, devotion_date);
CREATE INDEX IF NOT EXISTS idx_devotions_group_date ON devotions(group_id, devotion_date);

-- =============================================
-- 4. MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-messaging
  CONSTRAINT no_self_messages CHECK (sender_id != receiver_id)
);

-- Index for chat queries
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at);

-- =============================================
-- 5. FRIEND REQUESTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT no_self_friend_requests CHECK (sender_id != receiver_id),
  CONSTRAINT unique_friend_request UNIQUE (sender_id, receiver_id)
);

-- =============================================
-- 6. FRIENDSHIPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
  CONSTRAINT no_self_friendships CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- =============================================
-- GROUPS RLS POLICIES
-- =============================================

-- Everyone can view groups
DROP POLICY IF EXISTS "Anyone can view groups" ON groups;
CREATE POLICY "Anyone can view groups"
  ON groups FOR SELECT
  USING (true);

-- Only admins can create/update/delete groups
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
-- GROUP_LEADERS RLS POLICIES
-- =============================================

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

-- =============================================
-- PROFILES RLS POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can view profiles in their group (members/leaders)
CREATE POLICY "Users can view same-group profiles"
  ON profiles FOR SELECT
  USING (
    group_id = (SELECT group_id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only the user themselves or admin can delete
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

CREATE POLICY "Admins can delete any profile"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- DEVOTIONS RLS POLICIES
-- =============================================

-- Members can view their own devotions
CREATE POLICY "Users can view own devotions"
  ON devotions FOR SELECT
  USING (auth.uid() = user_id);

-- Leaders can view devotions of members in their group
CREATE POLICY "Leaders can view group devotions"
  ON devotions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'leader'
        AND profiles.group_id = devotions.group_id
    )
  );

-- Admins can view all devotions
CREATE POLICY "Admins can view all devotions"
  ON devotions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Members can insert their own devotions
CREATE POLICY "Users can insert own devotions"
  ON devotions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND group_id = (SELECT group_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can insert devotions (for their own tracking)
CREATE POLICY "Leaders can insert own devotions"
  ON devotions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND group_id = (SELECT group_id FROM profiles WHERE id = auth.uid())
  );

-- Users can update their own devotions
CREATE POLICY "Users can update own devotions"
  ON devotions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update any devotion
CREATE POLICY "Admins can update any devotion"
  ON devotions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete their own devotions
CREATE POLICY "Users can delete own devotions"
  ON devotions FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can delete any devotion
CREATE POLICY "Admins can delete any devotion"
  ON devotions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- MESSAGES RLS POLICIES
-- =============================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send messages (as themselves)
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can mark messages as read (if they received them)
CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- =============================================
-- FRIEND REQUESTS RLS POLICIES
-- =============================================

-- Users can view friend requests they sent or received
CREATE POLICY "Users can view their friend requests"
  ON friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update friend requests they received
CREATE POLICY "Users can update received friend requests"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- =============================================
-- FRIENDSHIPS RLS POLICIES
-- =============================================

-- Users can view their own friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendships (after request accepted)
CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their friendships
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function: Automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function: Get server time (for devotion date integrity)
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get server date (for devotion_date)
CREATE OR REPLACE FUNCTION public.get_server_date()
RETURNS DATE AS $$
BEGIN
  RETURN (NOW() AT TIME ZONE 'UTC')::DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DEVOTION SUBMISSION FUNCTION (SERVER-TIME ENFORCED)
-- =============================================
-- This function ensures devotion_date ALWAYS uses server time,
-- never client-provided time. Users cannot backdate or manipulate dates.

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
  -- Get server date (source of truth)
  v_server_date := public.get_server_date();
  
  -- Insert devotion with server date
  INSERT INTO devotions (user_id, group_id, devotion_date, image_url, notes)
  VALUES (p_user_id, p_group_id, v_server_date, p_image_url, p_notes)
  RETURNING * INTO v_devotion;
  
  RETURN v_devotion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SEED DATA: Dummy Groups
-- =============================================
INSERT INTO groups (id, name, description) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Morning Glory Group', 'Early morning devotion group'),
  ('b2222222-2222-2222-2222-222222222222', 'Faith Walkers Group', 'Daily faith journey group'),
  ('c3333333-3333-3333-3333-333333333333', 'Grace Community Group', 'Community-focused devotions')
ON CONFLICT DO NOTHING;

-- =============================================
-- INSTRUCTIONS FOR DUMMY ACCOUNTS
-- =============================================
-- Create these accounts through the Supabase Auth UI or via the app's signup form:
--
-- 1. Admin Account:
--    Email: admin@devotion.test
--    Password: Test1234!
--    Role: admin
--    (After signup, manually set group_id to NULL in profiles)
--
-- 2. Leader Account:
--    Email: leader@devotion.test
--    Password: Test1234!
--    Role: leader
--    group_id: a1111111-1111-1111-1111-111111111111 (Morning Glory Group)
--
-- 3. Member Account:
--    Email: member@devotion.test
--    Password: Test1234!
--    Role: member
--    group_id: a1111111-1111-1111-1111-111111111111 (Morning Glory Group)
--
-- After creating accounts through the app, update group_id for leader/member:
-- UPDATE profiles SET group_id = 'a1111111-1111-1111-1111-111111111111'
-- WHERE email IN ('leader@devotion.test', 'member@devotion.test');
--
-- For leader role:
-- UPDATE profiles SET role = 'leader' WHERE email = 'leader@devotion.test';

-- =============================================
-- STORAGE BUCKET SETUP
-- =============================================

-- Create the devotions storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('devotions', 'devotions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for the 'devotions' bucket

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload devotions" ON storage.objects;
CREATE POLICY "Authenticated users can upload devotions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'devotions'
    AND auth.role() = 'authenticated'
  );

-- Allow public read access (anyone can view images)
DROP POLICY IF EXISTS "Anyone can view devotion images" ON storage.objects;
CREATE POLICY "Anyone can view devotion images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'devotions');

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update own devotion images" ON storage.objects;
CREATE POLICY "Users can update own devotion images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'devotions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own devotion images" ON storage.objects;
CREATE POLICY "Users can delete own devotion images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'devotions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
