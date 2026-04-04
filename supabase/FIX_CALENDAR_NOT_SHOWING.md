# Fix: Devotion Submitted But Not Showing on Calendar

## Problem
After successfully submitting a devotion, the calendar doesn't show the green checkmark for the submitted date.

## Root Causes Found

### Bug #1: Timezone Mismatch in Date Comparison
**File:** `src/components/calendar/DevotionCalendar.jsx`

The `getDayStatus()` function used `.toISOString()` to convert calendar dates to strings:
```javascript
const dateStr = date.toISOString().split('T')[0];
```

**The problem:** `.toISOString()` converts to UTC, which shifts dates for users in positive UTC timezones (e.g., UTC+8). April 4 midnight local time becomes April 3 16:00 UTC, so the date string becomes `"2026-04-03"` instead of `"2026-04-04"`.

Meanwhile, Supabase stores `devotion_date` as a `DATE` column using server UTC time. When the calendar compares dates, the mismatched timezone causes the comparison to fail.

### Bug #2: No Optimistic Update After Submission
**File:** `src/hooks/useDevotions.js`

The `submitDevotion()` function awaited `fetchDevotions()` after submission:
```javascript
await fetchDevotions();
await fetchStats();
await fetchLeaderboard();
```

**The problem:** If `fetchDevotions()` failed silently (error caught inside but not re-thrown), the modal would show success but the calendar state would never update. Also, the modal closed after 1.5s regardless of whether the refresh completed.

## Fixes Applied

### Fix #1: Use Local Date Formatting
**Changed:** `DevotionCalendar.jsx` line 48

```javascript
// ❌ BEFORE (timezone bug)
const dateStr = date.toISOString().split('T')[0];

// ✅ AFTER (consistent local time)
import { format } from 'date-fns';
const dateStr = format(date, 'yyyy-MM-dd');
```

Also fixed `hasDevotionOn()` in `useDevotions.js` to use the same approach.

### Fix #2: Optimistic Updates
**Changed:** `useDevotions.js` `submitDevotion()` function

```javascript
// ✅ Optimistic update: immediately add to state
const serverDate = format(new Date(), 'yyyy-MM-dd');
setDevotions(prev => {
  const exists = prev.some(d => d.devotion_date === serverDate);
  if (exists) return prev;
  
  return [...prev, { 
    id: data.id, 
    devotion_date: serverDate, 
    image_url: data.image_url,
    notes: data.notes,
    created_at: data.created_at 
  }];
});

// ✅ Refresh in background (don't block)
fetchDevotions().catch(err => console.error('Failed to refresh:', err));
```

**Benefits:**
- Calendar updates **instantly** after submission (no waiting for API)
- Even if refresh fails, the optimistic update shows the devotion
- Duplicate detection prevents adding the same date twice

### Fix #3: Consistent Date Formatting
Added `import { format } from 'date-fns'` to both files for consistent date string generation across the app.

## Testing

To verify the fix works:

1. **Open the app** and log in as a member
2. **Navigate to the calendar** on your dashboard
3. **Click "Upload Devotion"**
4. **Select an image** (any JPEG/PNG/WebP < 2MB)
5. **Click "Submit Devotion"**
6. **Watch for:**
   - ✅ Modal shows "Devotion submitted!" success message
   - ✅ Calendar day for today turns **green** with a ✓ mark
   - ✅ The green highlight appears **immediately** (not after refresh)

## Files Changed

| File | Changes |
|------|---------|
| `src/components/calendar/DevotionCalendar.jsx` | Fixed `getDayStatus()` to use `format()` instead of `.toISOString()` |
| `src/hooks/useDevotions.js` | Added optimistic updates, fixed `hasDevotionOn()`, added error handling |

## Why This Works Now

1. **Consistent timezone handling**: Both calendar days and devotion dates use local time formatting via `date-fns`
2. **Instant feedback**: Optimistic updates show devotions immediately without waiting for API
3. **Background refresh**: Data re-fetches in background to ensure consistency
4. **Duplicate protection**: Checks if date exists before adding to prevent duplicates

## Still Not Working?

1. **Check browser console** for error messages
2. **Verify the submission succeeded**: Look for "Devotion submitted!" message
3. **Check the database**: Run `SELECT * FROM devotions WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 5;`
4. **Clear browser cache** and reload
5. **Check Supabase logs** in Dashboard → Database → Logs
