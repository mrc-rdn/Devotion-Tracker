# 📖 Full Bible Data Import Guide

## The Problem
Currently only 3 chapters have data (John 3, Genesis 1, Psalm 23). The full Bible has 1,189 chapters with ~31,000 verses.

## The Solution
A Node.js script that automatically downloads the **entire KJV Bible** from a free API and imports it to your Supabase database.

---

## 🚀 How to Import the Full Bible

### Step 1: Open Terminal
Open Command Prompt or PowerShell in your project folder:
```bash
cd C:\Users\John Marco\Desktop\DEVOTION
```

### Step 2: Run the Import Script
```bash
node supabase/import-bible-data.js
```

### Step 3: Wait (30-60 minutes)
The script will:
- Download all 1,189 chapters from bible-api.com
- Insert ~31,000 verses into your database
- Show progress as it goes
- Rate limit to avoid API bans (500ms delay between requests)

### Step 4: Verify
After it finishes, run this in Supabase SQL Editor:
```sql
SELECT COUNT(*) as total_verses FROM bible_verses;
```
You should see approximately **31,102** verses!

---

## ⏸️ Pause & Resume

If you need to stop and resume later, note the book number and chapter, then:
```bash
# Resume from Genesis chapter 10:
node supabase/import-bible-data.js 1 10

# Resume from Matthew:
node supabase/import-bible-data.js 40 1
```

---

## 📊 Book Numbers Reference

| Number | Book | Chapters |
|--------|------|----------|
| 1 | Genesis | 50 |
| 19 | Psalms | 150 |
| 20 | Proverbs | 31 |
| 23 | Isaiah | 66 |
| 40 | Matthew | 28 |
| 43 | John | 21 |
| 66 | Revelation | 22 |

Full list is in the script's `BIBLE_BOOKS` array.

---

## ⚠️ Important Notes

1. **KJV Only**: The API only provides KJV (English). Tagalog translations would need to be added manually.

2. **Time Required**: ~30-60 minutes due to API rate limiting (required to avoid bans).

3. **Internet Required**: Needs stable internet connection.

4. **Safe to Re-run**: If interrupted, just restart from where you left off. The script uses `ON CONFLICT DO NOTHING` so it won't duplicate data.

---

## 🔍 Alternative: Quick Sample Only

If you just want a few more chapters for testing:
```sql
-- Run this in Supabase SQL Editor
-- This adds John 1, 2, 4, 5 (more popular chapters)
```

Or use the provided `add_more_bible_verses.sql` file for Genesis 1 and Psalm 23.

---

## ✅ After Import

1. **Refresh your app** (F5)
2. **Open Bible page** from sidebar
3. **Select any book** - all chapters will now have verses!
4. **Search works** across all imported verses
5. **Version toggle** shows KJV (Tagalog will show KJV as fallback)

---

**Happy reading! 📖✨**
