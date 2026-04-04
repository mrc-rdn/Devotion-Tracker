/**
 * BULK BIBLE IMPORT SCRIPT
 * Fetches complete KJV Bible from free API and imports to Supabase
 * 
 * Usage: node supabase/import-bible-data.js
 */

const https = require('https');

// Supabase credentials (from your .env file)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// All 66 books with chapter counts
const BIBLE_BOOKS = [
  { id: 1, name: 'Genesis', short: 'Gen', chapters: 50 },
  { id: 2, name: 'Exodus', short: 'Exo', chapters: 40 },
  { id: 3, name: 'Leviticus', short: 'Lev', chapters: 27 },
  { id: 4, name: 'Numbers', short: 'Num', chapters: 36 },
  { id: 5, name: 'Deuteronomy', short: 'Deu', chapters: 34 },
  { id: 6, name: 'Joshua', short: 'Jos', chapters: 24 },
  { id: 7, name: 'Judges', short: 'Jdg', chapters: 21 },
  { id: 8, name: 'Ruth', short: 'Rut', chapters: 4 },
  { id: 9, name: '1 Samuel', short: '1Sa', chapters: 31 },
  { id: 10, name: '2 Samuel', short: '2Sa', chapters: 24 },
  { id: 11, name: '1 Kings', short: '1Ki', chapters: 22 },
  { id: 12, name: '2 Kings', short: '2Ki', chapters: 25 },
  { id: 13, name: '1 Chronicles', short: '1Ch', chapters: 29 },
  { id: 14, name: '2 Chronicles', short: '2Ch', chapters: 36 },
  { id: 15, name: 'Ezra', short: 'Ezr', chapters: 10 },
  { id: 16, name: 'Nehemiah', short: 'Neh', chapters: 13 },
  { id: 17, name: 'Esther', short: 'Est', chapters: 10 },
  { id: 18, name: 'Job', short: 'Job', chapters: 42 },
  { id: 19, name: 'Psalms', short: 'Psa', chapters: 150 },
  { id: 20, name: 'Proverbs', short: 'Pro', chapters: 31 },
  { id: 21, name: 'Ecclesiastes', short: 'Ecc', chapters: 12 },
  { id: 22, name: 'Song of Solomon', short: 'Sol', chapters: 8 },
  { id: 23, name: 'Isaiah', short: 'Isa', chapters: 66 },
  { id: 24, name: 'Jeremiah', short: 'Jer', chapters: 52 },
  { id: 25, name: 'Lamentations', short: 'Lam', chapters: 5 },
  { id: 26, name: 'Ezekiel', short: 'Eze', chapters: 48 },
  { id: 27, name: 'Daniel', short: 'Dan', chapters: 12 },
  { id: 28, name: 'Hosea', short: 'Hos', chapters: 14 },
  { id: 29, name: 'Joel', short: 'Joe', chapters: 3 },
  { id: 30, name: 'Amos', short: 'Amo', chapters: 9 },
  { id: 31, name: 'Obadiah', short: 'Oba', chapters: 1 },
  { id: 32, name: 'Jonah', short: 'Jon', chapters: 4 },
  { id: 33, name: 'Micah', short: 'Mic', chapters: 7 },
  { id: 34, name: 'Nahum', short: 'Nah', chapters: 3 },
  { id: 35, name: 'Habakkuk', short: 'Hab', chapters: 3 },
  { id: 36, name: 'Zephaniah', short: 'Zep', chapters: 3 },
  { id: 37, name: 'Haggai', short: 'Hag', chapters: 2 },
  { id: 38, name: 'Zechariah', short: 'Zec', chapters: 14 },
  { id: 39, name: 'Malachi', short: 'Mal', chapters: 4 },
  { id: 40, name: 'Matthew', short: 'Mat', chapters: 28 },
  { id: 41, name: 'Mark', short: 'Mar', chapters: 16 },
  { id: 42, name: 'Luke', short: 'Luk', chapters: 24 },
  { id: 43, name: 'John', short: 'Joh', chapters: 21 },
  { id: 44, name: 'Acts', short: 'Act', chapters: 28 },
  { id: 45, name: 'Romans', short: 'Rom', chapters: 16 },
  { id: 46, name: '1 Corinthians', short: '1Co', chapters: 16 },
  { id: 47, name: '2 Corinthians', short: '2Co', chapters: 13 },
  { id: 48, name: 'Galatians', short: 'Gal', chapters: 6 },
  { id: 49, name: 'Ephesians', short: 'Eph', chapters: 6 },
  { id: 50, name: 'Philippians', short: 'Phi', chapters: 4 },
  { id: 51, name: 'Colossians', short: 'Col', chapters: 4 },
  { id: 52, name: '1 Thessalonians', short: '1Th', chapters: 5 },
  { id: 53, name: '2 Thessalonians', short: '2Th', chapters: 3 },
  { id: 54, name: '1 Timothy', short: '1Ti', chapters: 6 },
  { id: 55, name: '2 Timothy', short: '2Ti', chapters: 4 },
  { id: 56, name: 'Titus', short: 'Tit', chapters: 3 },
  { id: 57, name: 'Philemon', short: 'Phm', chapters: 1 },
  { id: 58, name: 'Hebrews', short: 'Heb', chapters: 13 },
  { id: 59, name: 'James', short: 'Jam', chapters: 5 },
  { id: 60, name: '1 Peter', short: '1Pe', chapters: 5 },
  { id: 61, name: '2 Peter', short: '2Pe', chapters: 3 },
  { id: 62, name: '1 John', short: '1Jo', chapters: 5 },
  { id: 63, name: '2 John', short: '2Jo', chapters: 1 },
  { id: 64, name: '3 John', short: '3Jo', chapters: 1 },
  { id: 65, name: 'Jude', short: 'Jud', chapters: 1 },
  { id: 66, name: 'Revelation', short: 'Rev', chapters: 22 },
];

// Map book IDs to UUIDs used in your database
function getBookUUID(bookId) {
  const offset = 11111111 - 11111111;
  const hex = (111111111000 + bookId).toString(16).padStart(12, '0');
  return `11111111-1111-1111-1111-111111111${String(bookId).padStart(3, '0')}`;
}

// Fetch chapter from bible-api.com
function fetchChapter(bookName, chapter) {
  return new Promise((resolve, reject) => {
    const url = `https://bible-api.com/${encodeURIComponent(bookName)}+${chapter}?translation=kjv`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Insert verses into Supabase
async function insertVerses(bookUUID, chapter, verses) {
  const values = verses.map(v => {
    const verse = v.verse || v.verse_number;
    const text = v.text || '';
    return `('${bookUUID}', ${chapter}, ${verse}, '${text.replace(/'/g, "''")}', NULL)`;
  }).join(',\n  ');

  const sql = `INSERT INTO bible_verses (book_id, chapter, verse, text_kjv, text_tagalog) VALUES
  ${values}
ON CONFLICT DO NOTHING;`;

  // Use Supabase REST API
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/bible_verses?on_conflict=book_id,chapter,verse`;
    const postData = JSON.stringify(verses.map(v => ({
      book_id: bookUUID,
      chapter: chapter,
      verse: v.verse || v.verse_number,
      text_kjv: v.text || v.text_clean || '',
      text_tagalog: null,
    })));

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
    }, (res) => {
      let response = '';
      res.on('data', chunk => response += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          console.error(`Error: ${res.statusCode} - ${response}`);
          resolve(false);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Sleep function for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main import function
async function importBible(startBook = 1, startChapter = 1) {
  console.log('📖 Starting Bible Import...');
  console.log(`⚠️  This will take approximately 30-60 minutes`);
  console.log(`📡 Using API: bible-api.com`);
  console.log(`🔑 Supabase: ${SUPABASE_URL}\n`);

  let totalChapters = 0;
  let successCount = 0;
  let failCount = 0;

  // Count total chapters
  BIBLE_BOOKS.forEach(book => totalChapters += book.chapters);
  console.log(`📊 Total chapters to import: ${totalChapters}\n`);

  for (let bookIndex = startBook - 1; bookIndex < BIBLE_BOOKS.length; bookIndex++) {
    const book = BIBLE_BOOKS[bookIndex];
    const bookUUID = getBookUUID(book.id);

    console.log(`\n📚 Importing: ${book.name} (${book.chapters} chapters)`);

    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      if (bookIndex === startBook - 1 && chapter < startChapter) continue;

      try {
        console.log(`  ⏳ ${book.name} ${chapter}...`);
        
        const data = await fetchChapter(book.name, chapter);
        
        if (data && data.verses && data.verses.length > 0) {
          const success = await insertVerses(bookUUID, chapter, data.verses);
          if (success) {
            successCount++;
            console.log(`  ✅ ${book.name} ${chapter} - ${data.verses.length} verses imported`);
          } else {
            failCount++;
            console.log(`  ❌ ${book.name} ${chapter} - Insert failed`);
          }
        }

        // Rate limit: wait 500ms between requests
        await sleep(500);

      } catch (error) {
        failCount++;
        console.error(`  ❌ ${book.name} ${chapter} - ${error.message}`);
        await sleep(2000); // Wait longer on error
      }
    }
  }

  console.log('\n✅ Import Complete!');
  console.log(`📊 Summary:`);
  console.log(`   Success: ${successCount} chapters`);
  console.log(`   Failed: ${failCount} chapters`);
  console.log(`   Total: ${totalChapters} chapters`);
}

// Run if called directly
if (require.main === module) {
  // You can specify starting point: node import-bible-data.js 1 1
  const startBook = parseInt(process.argv[2]) || 1;
  const startChapter = parseInt(process.argv[3]) || 1;
  
  importBible(startBook, startChapter).catch(console.error);
}

module.exports = { importBible, BIBLE_BOOKS };
