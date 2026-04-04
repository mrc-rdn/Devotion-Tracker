# Group Members Migration - Summary

## ✅ Completed Changes

### 1. Database Schema Updates
**File**: `supabase/schema.sql`
- ✅ Removed `group_id` column from `profiles` table definition
- ✅ Added `group_members` junction table with proper constraints
- ✅ Added indexes for performance (`idx_group_members_group`, `idx_group_members_user`, `idx_group_members_role`)
- ✅ Note: RLS policies in schema.sql still reference old structure - they will be updated when you run the migration

**File**: `supabase/migration_group_members.sql` (NEW)
- ✅ Complete migration script that:
  - Creates `group_members` table
  - Migrates existing `profiles.group_id` data to `group_members`
  - Migrates `group_leaders` to `group_members`
  - Updates all RLS policies to use `group_members`
  - Creates helper views and functions
  - Includes verification queries

### 2. Frontend Application Updates

**File**: `src/contexts/AuthContext.jsx`
- ✅ Updated `fetchProfile()` to query `group_members` instead of joining via `profiles.group_id`
- ✅ Returns `profile.userGroups` (array of all groups)
- ✅ Returns `profile.userMemberships` (full membership data)
- ✅ Maintains backward compatibility with `profile.groupId` and `profile.groupName`

**File**: `src/pages/LeaderDashboard.jsx`
- ✅ Now uses `getGroupMembers()` from groups.service
- ✅ References `profile.groupId` instead of `profile.group_id`
- ✅ References `profile.groupName` instead of `profile.groups?.name`

**File**: `src/services/devotions.service.js`
- ✅ `submitDevotion()` now fetches group_id from `group_members` table
- ✅ `getLeaderboard()` now queries `group_members` with nested profiles

**File**: `src/services/messages.service.js`
- ✅ Removed `groups(name)` join from `searchUsers()`
- ✅ Removed `group_id` from user search results

**File**: `src/pages/AdminDashboard.jsx`
- ✅ Fetches users without group join
- ✅ Fetches group memberships separately for each user
- ✅ Displays primary group in the table

**File**: `src/hooks/useDevotions.js`
- ✅ `fetchLeaderboard()` now queries `group_members` instead of `profiles`

## 📋 What You Need to Do

### Step 1: Run the Migration Script
1. Open your Supabase Dashboard: https://app.supabase.com
2. Navigate to your project: **tkslrqgozwrmxcgpdyfm**
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file: `supabase/migration_group_members.sql` from your project
6. Copy the entire contents and paste into the SQL Editor
7. Click **Run** to execute the migration

### Step 2: Verify Migration
Run these verification queries in Supabase SQL Editor:
```sql
-- Check total migrated members
SELECT COUNT(*) as total_members FROM group_members;

-- View sample migrated data
SELECT 
  gm.group_id,
  g.name as group_name,
  gm.user_id,
  p.first_name,
  p.last_name,
  gm.role
FROM group_members gm
JOIN groups g ON g.id = gm.group_id
JOIN profiles p ON p.id = gm.user_id
LIMIT 10;

-- Test the helper view
SELECT * FROM group_members_with_profiles LIMIT 5;
```

### Step 3: Test the Application
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Test each user role:
   - **Admin**: Check admin dashboard loads, can assign users to groups
   - **Leader**: Check leader dashboard shows group members correctly
   - **Member**: Check member dashboard and group leaderboard
3. Test key features:
   - Submit a devotion
   - View group leaderboard
   - Check member list on leader dashboard
   - Search for users in messaging

### Step 4: (Optional) Remove Old Column
After verifying everything works, you can remove the old `group_id` column:
```sql
-- WARNING: This is irreversible!
-- Only run this after confirming all features work correctly
ALTER TABLE profiles DROP COLUMN IF EXISTS group_id;
```

## 🔍 Key Changes in Data Flow

### Before (Old System)
```
profiles.group_id → groups.id (single group)
```

### After (New System)
```
profiles ← group_members → groups (many-to-many)
```

### Profile Object Structure
```javascript
{
  id: 'user-uuid',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  role: 'member',
  
  // NEW: All user's groups
  userGroups: [
    { id: 'group-1', name: 'Morning Glory Group' },
    { id: 'group-2', name: 'Faith Walkers Group' }
  ],
  
  // NEW: Full membership data
  userMemberships: [
    { group_id: 'group-1', role: 'member', joined_at: '...' },
    { group_id: 'group-2', role: 'leader', joined_at: '...' }
  ],
  
  // LEGACY: Primary group (for backward compatibility)
  groupId: 'group-1',
  groupName: 'Morning Glory Group',
  memberRole: 'member',
  groups: { id: 'group-1', name: 'Morning Glory Group' }
}
```

## 🐛 Troubleshooting

### Error: "Failed to fetch profile"
**Cause**: Migration script hasn't been run yet
**Solution**: Run `supabase/migration_group_members.sql` in Supabase SQL Editor

### Error: "No members found"
**Cause**: `group_members` table is empty or RLS policies aren't set up
**Solution**: 
1. Verify migration ran: `SELECT COUNT(*) FROM group_members;`
2. Check RLS policies exist for `group_members` table

### Error 400 on profiles query
**Cause**: Code still trying to join `profiles` with `groups` via old relationship
**Solution**: All code has been updated. If you see this, restart your dev server:
```bash
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

### Leaderboard not showing data
**Cause**: User not in `group_members` table
**Solution**: Ensure user has joined a group via the "Join Group" feature

## 📝 Files Modified
1. ✅ `supabase/schema.sql` - Updated schema definition
2. ✅ `supabase/migration_group_members.sql` - NEW migration script
3. ✅ `src/contexts/AuthContext.jsx` - Profile fetching
4. ✅ `src/pages/LeaderDashboard.jsx` - Member fetching
5. ✅ `src/services/devotions.service.js` - Devotion submission & leaderboard
6. ✅ `src/services/messages.service.js` - User search
7. ✅ `src/pages/AdminDashboard.jsx` - User-group assignments
8. ✅ `src/hooks/useDevotions.js` - Leaderboard fetching

## 📚 Additional Documentation
- See `MIGRATION_GUIDE.md` for detailed migration instructions
- See `AGENTS.md` for project architecture and coding standards

## ✨ Benefits of New System

1. **Multiple Groups**: Users can now join multiple groups
2. **Flexible Roles**: Leaders can manage multiple groups
3. **Better Tracking**: Complete membership history with join dates
4. **Scalable**: Easy to add features like group switching
5. **Clean Architecture**: Proper junction table pattern

---

**Migration Date**: April 4, 2026
**Database**: Supabase (tkslrqgozwrmxcgpdyfm)
**Status**: ✅ Code Complete - Ready to Execute Migration
