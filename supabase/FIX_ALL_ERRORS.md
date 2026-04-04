# ⚡ FIX ALL ERRORS - Simple 3 Steps

## What Was Wrong
1. ❌ `group_leaders` table missing → "Failed to search groups"
2. ❌ `devotions` storage bucket missing → "Bucket not found"
3. ❌ Schema had conflicting policies → "policy already exists"

## ✅ The Fix (Takes 1 Minute)

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Click your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Run the Migration Script
1. Open the file: **`supabase/RUN_THIS_MIGRATION.sql`**
2. **Copy ALL content** from that file
3. **Paste** into the SQL Editor  
4. Click **RUN** (or press Ctrl+Enter)

### Step 3: Test Your App
1. Refresh your browser
2. Try searching for groups as a member ✅
3. Try uploading a devotion image ✅

## What the Script Does
- ✅ Creates `group_leaders` table (safe, won't duplicate)
- ✅ Adds all group_leaders RLS policies
- ✅ Fixes groups policies (drops & recreates safely)
- ✅ Creates `devotions` storage bucket
- ✅ Adds all 4 storage policies
- ✅ Auto-populates existing leaders

## Still Getting Errors?
Check `supabase/FIX_GROUP_SEARCH.md` for detailed troubleshooting.
