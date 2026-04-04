# 📖 Bible Feature Setup Guide

## Overview
The Bible feature has been successfully implemented with the following capabilities:
- ✅ **KJV (English)** and **Tagalog** version support
- ✅ **Search** with debounced input and auto-suggestions
- ✅ **Book & Chapter** navigation (all 66 books)
- ✅ **Verse highlighting** and **copy to clipboard**
- ✅ **Favorite verses** saved to Supabase
- ✅ **Mobile responsive** design
- ✅ **Loading states** and error handling

## 🚀 Setup Instructions

### Step 1: Create Bible Tables in Supabase

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file: `supabase/bible_schema.sql`
4. **Copy ALL content** from that file
5. **Paste** into the SQL Editor
6. Click **RUN** to execute

This will create:
- `bible_books` table (66 books)
- `bible_verses` table (with KJV and Tagalog text)
- `bible_favorites` table (user favorites)
- RLS policies for secure access
- Sample data (John 3 complete chapter)

### Step 2: Verify Setup

Run this query in Supabase SQL Editor to verify:
```sql
SELECT COUNT(*) as book_count FROM bible_books;
SELECT COUNT(*) as verse_count FROM bible_verses;
```

You should see:
- **book_count**: 66
- **verse_count**: 36 (John 3 sample data)

### Step 3: Access the Bible Feature

1. **Log in** to your Devotion Tracker app
2. Look for the **"Bible"** link in the sidebar navigation
3. Click it to access `/[role]/bible`

## 📚 Features Guide

### 1. Book Selection
- Click the **book dropdown** at the top
- Books are organized by **Old Testament** and **New Testament**
- Select any book to start reading

### 2. Chapter Navigation
- Chapter buttons appear below the book selector
- Click any chapter number to navigate
- Active chapter is highlighted in blue

### 3. Version Switching
- Click the **version dropdown** (shows "KJV (English)" or "Tagalog")
- Switch between:
  - **KJV** - King James Version (English)
  - **Tagalog** - Filipino translation

### 4. Search Verses
- Type in the **search box** (minimum 2 characters)
- Results appear after 300ms debounce
- Click a result to jump to that verse
- Searches both KJV and Tagalog text

### 5. Favorite Verses
- Click the **⭐ star icon** on any verse to save it
- Click the **"Favorites"** button to view all saved verses
- Click **❌** to remove from favorites
- Favorites are stored per user in Supabase

### 6. Copy Verse
- Click the **📋 copy icon** on any verse
- Verse text is copied with reference (e.g., "John 3:16")
- Icon changes to ✓ for 2 seconds as confirmation

### 7. Verse Highlighting
- Clicking a search result **highlights** the verse in yellow
- Helps you quickly locate the verse in context

## 🎨 UI/UX Features

- **Responsive design** - Works on mobile and desktop
- **Loading spinners** - Shows progress while fetching data
- **Error handling** - Graceful error messages
- **Smooth transitions** - Clean animations and hover effects
- **Accessible** - Keyboard navigation support

## 📊 Database Structure

### Tables Created
```
bible_books
├── id (UUID)
├── name (TEXT) - Full book name
├── name_short (TEXT) - Abbreviation
├── testament (TEXT) - 'OT' or 'NT'
├── chapter_count (INTEGER)
└── sort_order (INTEGER)

bible_verses
├── id (UUID)
├── book_id (UUID) - FK to bible_books
├── chapter (INTEGER)
├── verse (INTEGER)
├── text_kjv (TEXT) - English KJV
├── text_tagalog (TEXT) - Tagalog version
└── UNIQUE(book_id, chapter, verse)

bible_favorites
├── id (UUID)
├── user_id (UUID) - FK to profiles
├── verse_id (UUID) - FK to bible_verses
├── created_at (TIMESTAMPTZ)
└── UNIQUE(user_id, verse_id)
```

## 🔒 Security (RLS Policies)

- ✅ Everyone can **read** Bible books and verses
- ✅ Users can **view** their own favorites
- ✅ Users can **add** favorites (authenticated only)
- ✅ Users can **delete** their own favorites
- ✅ No one can modify Bible text (read-only)

## 📝 Adding More Bible Data

The sample includes **John 3** (36 verses). To add more chapters:

```sql
-- Example: Add Genesis 1:1-5
INSERT INTO bible_verses (book_id, chapter, verse, text_kjv, text_tagalog) VALUES
  ('11111111-1111-1111-1111-111111111001', 1, 1, 'In the beginning God created the heaven and the earth.', 'Sa pasimula ay nilalang ng Dios ang langit at ang lupa.', 'Genesis 1:1'),
  -- Add more verses...
ON CONFLICT DO NOTHING;
```

**Tip:** Use the book IDs from the `bible_books` table (they follow the pattern `...1001` for Genesis, `...1043` for John, etc.)

## 🐛 Troubleshooting

### "No verses available" message
- Check if verses exist: `SELECT COUNT(*) FROM bible_verses WHERE book_id = '...';`
- Make sure you've run the `bible_schema.sql` script

### Search not working
- Check browser console for errors
- Verify `bible_verses` table has data
- Ensure you're typing at least 2 characters

### Favorites not saving
- Verify you're logged in
- Check `bible_favorites` table exists
- Check RLS policies are enabled

### Bible link not showing in sidebar
- Clear browser cache
- Check `DashboardLayout.jsx` has `BookOpen` import
- Verify routing in `App.jsx`

## 📦 Files Created/Modified

| File | Purpose |
|------|---------|
| `supabase/bible_schema.sql` | Database schema + sample data |
| `src/pages/Bible.jsx` | Main Bible page component |
| `src/services/bible.service.js` | Supabase API functions |
| `src/App.jsx` | Added Bible routes |
| `src/layouts/DashboardLayout.jsx` | Added Bible nav link |

## 🎯 Next Steps (Optional Enhancements)

1. **Add full Bible text** - Import complete KJV and Tagalog data
2. **Reading plans** - Daily/weekly reading schedules
3. **Notes** - Add personal notes to verses
4. **Sharing** - Share verses via social media
5. **Audio** - Text-to-speech for audio Bible
6. **Cross-references** - Link related verses
7. **Study tools** - Concordance, dictionary, maps

## ✨ Testing Checklist

- [ ] Run `bible_schema.sql` in Supabase
- [ ] Verify 66 books loaded
- [ ] Verify John 3 sample data loaded
- [ ] Login as member and access Bible
- [ ] Test book selection
- [ ] Test chapter navigation
- [ ] Test version switching (KJV ↔ Tagalog)
- [ ] Test search functionality
- [ ] Test adding favorites
- [ ] Test removing favorites
- [ ] Test copy to clipboard
- [ ] Test on mobile device
- [ ] Verify all roles (member/leader/admin) can access

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Verify database tables exist
3. Check Supabase logs (Dashboard → Database → Logs)
4. Ensure RLS policies are enabled

---

**Enjoy reading God's Word in both English and Tagalog! 🙏📖**
