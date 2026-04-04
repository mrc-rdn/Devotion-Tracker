-- =============================================
-- CREATE DEVOTIONS STORAGE BUCKET
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Insert the bucket into storage.buckets
-- This creates the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('devotions', 'devotions', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for the 'devotions' bucket

-- Policy: Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload devotions" ON storage.objects;
CREATE POLICY "Authenticated users can upload devotions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'devotions'
    AND auth.role() = 'authenticated'
  );

-- Policy: Allow public read access (anyone can view images)
DROP POLICY IF EXISTS "Anyone can view devotion images" ON storage.objects;
CREATE POLICY "Anyone can view devotion images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'devotions');

-- Policy: Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update own devotion images" ON storage.objects;
CREATE POLICY "Users can update own devotion images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'devotions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own devotion images" ON storage.objects;
CREATE POLICY "Users can delete own devotion images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'devotions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Verify bucket creation
-- SELECT * FROM storage.buckets WHERE id = 'devotions';
