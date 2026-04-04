# Fix: "Failed to search groups" & "Bucket not found" Errors

## Problems Fixed

### 1. "Failed to search groups" Error
The `searchGroups` function in `groups.service.js` was querying a `group_leaders` table that didn't exist in the database schema.

### 2. "Bucket not found" Error
The `devotions` storage bucket was not created automatically, causing image uploads to fail.

## Solutions Applied

### For "Failed to search groups":
- Added `group_leaders` table to schema with proper constraints
- Added indexes for performance
- Added RLS policies for security
- Fixed nested query syntax in `searchGroups` function

### For "Bucket not found":
- Added automatic storage bucket creation to schema.sql
- Added 4 storage RLS policies for upload, read, update, and delete
- Set bucket to public for image viewing

## How to Apply the Fixes

### Option 1: Run Migration Scripts (Recommended for Existing Databases)

If you already have a database and just need to add the missing pieces:

#### Step 1: Fix Group Search
1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Open the file: `supabase/add_group_leaders_table.sql`
3. Copy and paste the entire content into the SQL Editor
4. Click **Run** to execute the migration

#### Step 2: Fix Storage Bucket
1. In the **SQL Editor**, open: `supabase/create_storage_bucket.sql`
2. Copy and paste the entire content into the SQL Editor
3. Click **Run** to create the bucket and policies

### Option 2: Reset Database (For Fresh Development)

If you're starting fresh and can afford to reset your database:

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Open the file: `supabase/schema.sql`
3. Copy and paste the entire content into the SQL Editor
4. Click **Run** to execute the full schema (includes both fixes)

## Verification

### Test Group Search:
1. Log in as a member account
2. Navigate to **Join Group** in the sidebar
3. Type a group name in the search box (e.g., "Morning")
4. You should see matching groups appear in the dropdown
5. Check the browser console - there should be no "Failed to search groups" error

### Test Storage Bucket:
1. Log in as a member account
2. Go to your dashboard
3. Click on a date in the calendar to upload a devotion
4. Select an image file (JPEG, PNG, or WebP, max 2MB)
5. Add optional notes and click "Submit"
6. The upload should succeed without "Bucket not found" error
7. The image should display in the calendar

## What Changed

### Files Modified
- `supabase/schema.sql` - Added `group_leaders` table, RLS policies, and storage bucket setup
- `supabase/add_group_leaders_table.sql` - New migration script (for existing databases)
- `supabase/create_storage_bucket.sql` - New storage bucket creation script
- `src/services/groups.service.js` - Fixed nested query syntax for profiles lookup

### Database Changes
- Created `group_leaders` join table
- Added indexes on `group_id` and `leader_id`
- Added 5 RLS policies for group_leaders access
- Created `devotions` storage bucket (public)
- Added 4 storage policies for image management
- RLS enables anyone to view group leaders and storage bucket

## Next Steps

### For Group Leaders
If you have existing leaders in your database, you may want to manually add them to the `group_leaders` table:

```sql
-- Example: Add leader to Morning Glory Group
INSERT INTO group_leaders (group_id, leader_id)
SELECT 
  'a1111111-1111-1111-1111-111111111111',  -- Morning Glory Group ID
  id
FROM profiles 
WHERE email = 'leader@devotion.test';
```

Or run the automatic migration script which handles this for seed data.

### For Storage
The bucket is now set up with:
- **Public read access**: Anyone can view devotion images
- **Authenticated upload**: Only logged-in users can upload
- **User-scoped updates/deletes**: Users can only manage their own files
- File structure: `{userId}/{timestamp}.{ext}`

## Troubleshooting

### Still seeing "Failed to search groups"?
1. Check browser console for specific error messages
2. Verify the `group_leaders` table exists: `SELECT * FROM group_leaders;`
3. Check RLS is enabled: `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'group_leaders';`
4. Test the query directly in Supabase SQL Editor
5. Check Supabase logs in Dashboard → Database → Logs

### Still seeing "Bucket not found"?
1. Verify bucket exists: `SELECT * FROM storage.buckets WHERE id = 'devotions';`
2. Check bucket is public: The `public` column should be `true`
3. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'objects';`
4. Try uploading a small image file (< 1MB)
5. Check browser Network tab for the exact failing request

### No groups showing up in search?
1. Verify groups exist: `SELECT * FROM groups;`
2. Make sure you're typing at least 2 characters (search requirement)
3. Check that the search query matches part of the group name

### Image upload fails?
1. Check file size (must be < 2MB)
2. Check file type (must be JPEG, PNG, or WebP)
3. Verify you're logged in as an authenticated user
4. Check browser console for error messages
5. Verify storage policies are applied in Supabase Dashboard → Storage → Policies
