# Migration Guide: Group Members System

## Overview
This migration converts the single-group relationship (`profiles.group_id`) to a many-to-many relationship using a `group_members` junction table. This allows users to join multiple groups and leaders to manage multiple groups.

## What Changed

### Database Changes
1. **New Table**: `group_members` - Junction table connecting users and groups
   - `id` (UUID, primary key)
   - `group_id` (UUID, references groups)
   - `user_id` (UUID, references profiles)
   - `role` (TEXT: 'leader' or 'member')
   - `joined_at` (TIMESTAMPTZ)

2. **Removed Column**: `profiles.group_id` column is kept for backward compatibility but is NO LONGER the source of truth. The `group_members` table is now the authoritative source for user-group relationships.

3. **New RLS Policies**: Updated to use `group_members` instead of `profiles.group_id`

4. **Helper Functions**: 
   - `get_user_groups(user_id)` - Get all groups for a user
   - `get_group_members(group_id)` - Get all members of a group

### Application Changes
1. **AuthContext.jsx**: Now fetches user groups via `group_members` and provides:
   - `profile.userGroups` - Array of all user's groups
   - `profile.userMemberships` - Full membership data
   - `profile.groupId` - Primary group ID (backward compatibility)
   - `profile.groupName` - Primary group name (backward compatibility)
   - `profile.memberRole` - User's role in primary group

2. **LeaderDashboard.jsx**: Uses `getGroupMembers()` from groups.service instead of direct profile queries

3. **devotions.service.js**: 
   - `submitDevotion()` now fetches group_id from `group_members`
   - `getLeaderboard()` now queries `group_members` table

4. **messages.service.js**: Removed `groups(name)` join from user search

5. **AdminDashboard.jsx**: Fetches user-group relationships from `group_members`

6. **useDevotions.js**: Fetches group_id from `group_members` for leaderboard

## Migration Steps

### Step 1: Run the Migration Script
1. Go to your Supabase Dashboard → SQL Editor
2. Open the file: `supabase/migration_group_members.sql`
3. Execute the entire script
4. Verify the migration worked by running:
   ```sql
   SELECT COUNT(*) as total_members FROM group_members;
   SELECT * FROM group_members_with_profiles LIMIT 10;
   ```

### Step 2: Verify Data Migration
Check that existing users were migrated correctly:
```sql
-- Check migrated memberships
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
```

### Step 3: Update Local Schema (Optional)
If you want to completely remove the `group_id` column from profiles (recommended after verifying migration):
```sql
-- WARNING: This is irreversible!
ALTER TABLE profiles DROP COLUMN IF EXISTS group_id;
```

**Note**: The current code keeps `profiles.group_id` for backward compatibility. You can remove it later once you're confident everything works.

### Step 4: Test the Application
1. Login as each role (admin, leader, member)
2. Verify dashboards load correctly
3. Test joining/leaving groups
4. Test submitting devotions
5. Test the leaderboard
6. Test leader viewing member progress

## Using the New System

### For Leaders
- Leaders can now be members of multiple groups
- When viewing the dashboard, leaders see their **primary group** (most recently joined)
- The `getGroupMembers()` function in `groups.service.js` handles fetching all members

### For Members  
- Members can join multiple groups using the "Join Group" feature
- Their primary group (most recent) determines which leaderboard/calendar they see
- All group memberships are tracked in `group_members`

### For Admins
- Admins can see all users and their group memberships
- The admin panel shows the primary group for each user
- Full membership data is available via `profile.userGroups`

## API Changes

### New Functions in groups.service.js
```javascript
// Get all groups where user is a leader
getLeaderGroups(userId)

// Get all groups where user is a member
getUserGroups(userId)

// Get all members of a specific group
getGroupMembers(groupId)

// Get leaderboard for a group
getGroupLeaderboard(groupId, startDate, endDate)
```

### Profile Object Structure
```javascript
{
  id: 'uuid',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  role: 'member',
  
  // New fields:
  userGroups: [
    { id: 'uuid', name: 'Group 1', description: '...' },
    { id: 'uuid', name: 'Group 2', description: '...' }
  ],
  userMemberships: [
    { group_id: 'uuid', role: 'member', joined_at: '...' },
    { group_id: 'uuid', role: 'leader', joined_at: '...' }
  ],
  
  // Legacy fields (for backward compatibility):
  groupId: 'uuid', // Primary group ID (first in array)
  groupName: 'Group 1', // Primary group name
  memberRole: 'member', // Role in primary group
  groups: { id: 'uuid', name: 'Group 1' } // Legacy object
}
```

## Troubleshooting

### "No members found" error
- Check that `group_members` table has data: `SELECT COUNT(*) FROM group_members;`
- Verify RLS policies are applied: Check Supabase → Authentication → Policies
- Check browser console for errors

### Profile fetch errors
- Ensure the migration script ran successfully
- Check that `group_members` table exists
- Verify RLS policies allow reading group_members

### Devotion submission fails
- User must be a member of a group to submit devotions
- Check `group_members` table for the user's membership
- Verify the `submit_devotion` RPC function exists

## Next Steps

### Future Enhancements
1. **Group Switching**: Allow users to switch between their groups in the UI
2. **Multi-Group Dashboard**: Show data from all user's groups
3. **Group Invitations**: Allow leaders to invite users to their groups
4. **Group Analytics**: Show leaders analytics across all their groups

### Cleanup (Optional)
After verifying everything works:
1. Remove `profiles.group_id` column
2. Remove legacy `group_leaders` table if no longer needed
3. Update any remaining code that references `profiles.group_id`

## Support
If you encounter issues:
1. Check the browser console for errors
2. Verify the migration script completed successfully
3. Check Supabase logs for database errors
4. Review RLS policies in Supabase Dashboard

---

**Migration Date**: 2026-04-04
**Database**: Supabase (tkslrqgozwrmxcgpdyfm)
**Status**: Ready to Execute
