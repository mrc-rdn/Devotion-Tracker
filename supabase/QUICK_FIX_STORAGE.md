# Quick Fix: "Bucket not found" Error

## What's Wrong?
The `devotions` storage bucket doesn't exist in your Supabase project. This prevents members from uploading devotion images.

## Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Storage Script
1. Open the file: `supabase/create_storage_bucket.sql`
2. **Copy ALL the content** from that file
3. **Paste** into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify It Worked
Run this query in the SQL Editor to confirm:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'devotions';
```

You should see:
```
id         | name      | public
-----------|-----------|--------
devotions  | devotions | true
```

### Step 4: Test in Your App
1. Log in as a member
2. Click on any date in the calendar
3. Upload a devotion image
4. It should work without "Bucket not found" error!

## What the Script Does
- ✅ Creates the `devotions` storage bucket (set to public)
- ✅ Adds policy: Authenticated users can upload
- ✅ Adds policy: Anyone can view images
- ✅ Adds policy: Users can update their own files
- ✅ Adds policy: Users can delete their own files

## Alternative: Full Schema Reset
If you prefer to reset everything from scratch:
1. Copy content from `supabase/schema.sql`
2. Run it in SQL Editor
3. This includes BOTH the group_leaders table AND storage bucket

## Still Having Issues?
See `supabase/FIX_GROUP_SEARCH.md` for detailed troubleshooting.
