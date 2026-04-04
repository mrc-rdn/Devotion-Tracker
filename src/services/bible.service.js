import { supabase } from '../lib/supabase';

const BIBLE_API_BASE = 'https://bible-api.com';

// All 66 Bible books with chapter counts
export const BIBLE_BOOKS = [
  // Old Testament (39 books)
  { id: 1, name: 'Genesis', short: 'Gen', testament: 'OT', chapters: 50, sort_order: 1 },
  { id: 2, name: 'Exodus', short: 'Exo', testament: 'OT', chapters: 40, sort_order: 2 },
  { id: 3, name: 'Leviticus', short: 'Lev', testament: 'OT', chapters: 27, sort_order: 3 },
  { id: 4, name: 'Numbers', short: 'Num', testament: 'OT', chapters: 36, sort_order: 4 },
  { id: 5, name: 'Deuteronomy', short: 'Deu', testament: 'OT', chapters: 34, sort_order: 5 },
  { id: 6, name: 'Joshua', short: 'Jos', testament: 'OT', chapters: 24, sort_order: 6 },
  { id: 7, name: 'Judges', short: 'Jdg', testament: 'OT', chapters: 21, sort_order: 7 },
  { id: 8, name: 'Ruth', short: 'Rut', testament: 'OT', chapters: 4, sort_order: 8 },
  { id: 9, name: '1 Samuel', short: '1Sa', testament: 'OT', chapters: 31, sort_order: 9 },
  { id: 10, name: '2 Samuel', short: '2Sa', testament: 'OT', chapters: 24, sort_order: 10 },
  { id: 11, name: '1 Kings', short: '1Ki', testament: 'OT', chapters: 22, sort_order: 11 },
  { id: 12, name: '2 Kings', short: '2Ki', testament: 'OT', chapters: 25, sort_order: 12 },
  { id: 13, name: '1 Chronicles', short: '1Ch', testament: 'OT', chapters: 29, sort_order: 13 },
  { id: 14, name: '2 Chronicles', short: '2Ch', testament: 'OT', chapters: 36, sort_order: 14 },
  { id: 15, name: 'Ezra', short: 'Ezr', testament: 'OT', chapters: 10, sort_order: 15 },
  { id: 16, name: 'Nehemiah', short: 'Neh', testament: 'OT', chapters: 13, sort_order: 16 },
  { id: 17, name: 'Esther', short: 'Est', testament: 'OT', chapters: 10, sort_order: 17 },
  { id: 18, name: 'Job', short: 'Job', testament: 'OT', chapters: 42, sort_order: 18 },
  { id: 19, name: 'Psalms', short: 'Psa', testament: 'OT', chapters: 150, sort_order: 19 },
  { id: 20, name: 'Proverbs', short: 'Pro', testament: 'OT', chapters: 31, sort_order: 20 },
  { id: 21, name: 'Ecclesiastes', short: 'Ecc', testament: 'OT', chapters: 12, sort_order: 21 },
  { id: 22, name: 'Song of Solomon', short: 'Sol', testament: 'OT', chapters: 8, sort_order: 22 },
  { id: 23, name: 'Isaiah', short: 'Isa', testament: 'OT', chapters: 66, sort_order: 23 },
  { id: 24, name: 'Jeremiah', short: 'Jer', testament: 'OT', chapters: 52, sort_order: 24 },
  { id: 25, name: 'Lamentations', short: 'Lam', testament: 'OT', chapters: 5, sort_order: 25 },
  { id: 26, name: 'Ezekiel', short: 'Eze', testament: 'OT', chapters: 48, sort_order: 26 },
  { id: 27, name: 'Daniel', short: 'Dan', testament: 'OT', chapters: 12, sort_order: 27 },
  { id: 28, name: 'Hosea', short: 'Hos', testament: 'OT', chapters: 14, sort_order: 28 },
  { id: 29, name: 'Joel', short: 'Joe', testament: 'OT', chapters: 3, sort_order: 29 },
  { id: 30, name: 'Amos', short: 'Amo', testament: 'OT', chapters: 9, sort_order: 30 },
  { id: 31, name: 'Obadiah', short: 'Oba', testament: 'OT', chapters: 1, sort_order: 31 },
  { id: 32, name: 'Jonah', short: 'Jon', testament: 'OT', chapters: 4, sort_order: 32 },
  { id: 33, name: 'Micah', short: 'Mic', testament: 'OT', chapters: 7, sort_order: 33 },
  { id: 34, name: 'Nahum', short: 'Nah', testament: 'OT', chapters: 3, sort_order: 34 },
  { id: 35, name: 'Habakkuk', short: 'Hab', testament: 'OT', chapters: 3, sort_order: 35 },
  { id: 36, name: 'Zephaniah', short: 'Zep', testament: 'OT', chapters: 3, sort_order: 36 },
  { id: 37, name: 'Haggai', short: 'Hag', testament: 'OT', chapters: 2, sort_order: 37 },
  { id: 38, name: 'Zechariah', short: 'Zec', testament: 'OT', chapters: 14, sort_order: 38 },
  { id: 39, name: 'Malachi', short: 'Mal', testament: 'OT', chapters: 4, sort_order: 39 },
  // New Testament (27 books)
  { id: 40, name: 'Matthew', short: 'Mat', testament: 'NT', chapters: 28, sort_order: 40 },
  { id: 41, name: 'Mark', short: 'Mar', testament: 'NT', chapters: 16, sort_order: 41 },
  { id: 42, name: 'Luke', short: 'Luk', testament: 'NT', chapters: 24, sort_order: 42 },
  { id: 43, name: 'John', short: 'Joh', testament: 'NT', chapters: 21, sort_order: 43 },
  { id: 44, name: 'Acts', short: 'Act', testament: 'NT', chapters: 28, sort_order: 44 },
  { id: 45, name: 'Romans', short: 'Rom', testament: 'NT', chapters: 16, sort_order: 45 },
  { id: 46, name: '1 Corinthians', short: '1Co', testament: 'NT', chapters: 16, sort_order: 46 },
  { id: 47, name: '2 Corinthians', short: '2Co', testament: 'NT', chapters: 13, sort_order: 47 },
  { id: 48, name: 'Galatians', short: 'Gal', testament: 'NT', chapters: 6, sort_order: 48 },
  { id: 49, name: 'Ephesians', short: 'Eph', testament: 'NT', chapters: 6, sort_order: 49 },
  { id: 50, name: 'Philippians', short: 'Phi', testament: 'NT', chapters: 4, sort_order: 50 },
  { id: 51, name: 'Colossians', short: 'Col', testament: 'NT', chapters: 4, sort_order: 51 },
  { id: 52, name: '1 Thessalonians', short: '1Th', testament: 'NT', chapters: 5, sort_order: 52 },
  { id: 53, name: '2 Thessalonians', short: '2Th', testament: 'NT', chapters: 3, sort_order: 53 },
  { id: 54, name: '1 Timothy', short: '1Ti', testament: 'NT', chapters: 6, sort_order: 54 },
  { id: 55, name: '2 Timothy', short: '2Ti', testament: 'NT', chapters: 4, sort_order: 55 },
  { id: 56, name: 'Titus', short: 'Tit', testament: 'NT', chapters: 3, sort_order: 56 },
  { id: 57, name: 'Philemon', short: 'Phm', testament: 'NT', chapters: 1, sort_order: 57 },
  { id: 58, name: 'Hebrews', short: 'Heb', testament: 'NT', chapters: 13, sort_order: 58 },
  { id: 59, name: 'James', short: 'Jam', testament: 'NT', chapters: 5, sort_order: 59 },
  { id: 60, name: '1 Peter', short: '1Pe', testament: 'NT', chapters: 5, sort_order: 60 },
  { id: 61, name: '2 Peter', short: '2Pe', testament: 'NT', chapters: 3, sort_order: 61 },
  { id: 62, name: '1 John', short: '1Jo', testament: 'NT', chapters: 5, sort_order: 62 },
  { id: 63, name: '2 John', short: '2Jo', testament: 'NT', chapters: 1, sort_order: 63 },
  { id: 64, name: '3 John', short: '3Jo', testament: 'NT', chapters: 1, sort_order: 64 },
  { id: 65, name: 'Jude', short: 'Jud', testament: 'NT', chapters: 1, sort_order: 65 },
  { id: 66, name: 'Revelation', short: 'Rev', testament: 'NT', chapters: 22, sort_order: 66 },
];

/**
 * Normalize book name for API
 * Converts user input to API-friendly format
 */
function normalizeBookName(input) {
  const nameMap = {
    'gen': 'Genesis', 'genesis': 'Genesis',
    'exo': 'Exodus', 'exodus': 'Exodus',
    'lev': 'Leviticus', 'leviticus': 'Leviticus',
    'num': 'Numbers', 'numbers': 'Numbers',
    'deu': 'Deuteronomy', 'deuteronomy': 'Deuteronomy',
    'jos': 'Joshua', 'joshua': 'Joshua',
    'jdg': 'Judges', 'judges': 'Judges',
    'rut': 'Ruth', 'ruth': 'Ruth',
    '1sa': '1 Samuel', '1 samuel': '1 Samuel',
    '2sa': '2 Samuel', '2 samuel': '2 Samuel',
    '1ki': '1 Kings', '1 kings': '1 Kings',
    '2ki': '2 Kings', '2 kings': '2 Kings',
    '1ch': '1 Chronicles', '1 chronicles': '1 Chronicles',
    '2ch': '2 Chronicles', '2 chronicles': '2 Chronicles',
    'ezr': 'Ezra', 'ezra': 'Ezra',
    'neh': 'Nehemiah', 'nehemiah': 'Nehemiah',
    'est': 'Esther', 'esther': 'Esther',
    'job': 'Job', 'job': 'Job',
    'psa': 'Psalms', 'psalm': 'Psalms', 'ps': 'Psalms',
    'pro': 'Proverbs', 'proverbs': 'Proverbs',
    'ecc': 'Ecclesiastes', 'ecclesiastes': 'Ecclesiastes',
    'sol': 'Song of Solomon', 'song of solomon': 'Song of Solomon', 'song': 'Song of Solomon',
    'isa': 'Isaiah', 'isaiah': 'Isaiah',
    'jer': 'Jeremiah', 'jeremiah': 'Jeremiah',
    'lam': 'Lamentations', 'lamentations': 'Lamentations',
    'eze': 'Ezekiel', 'ezekiel': 'Ezekiel',
    'dan': 'Daniel', 'daniel': 'Daniel',
    'hos': 'Hosea', 'hosea': 'Hosea',
    'joe': 'Joel', 'joel': 'Joel',
    'amo': 'Amos', 'amos': 'Amos',
    'oba': 'Obadiah', 'obadiah': 'Obadiah',
    'jon': 'Jonah', 'jonah': 'Jonah',
    'mic': 'Micah', 'micah': 'Micah',
    'nah': 'Nahum', 'nahum': 'Nahum',
    'hab': 'Habakkuk', 'habakkuk': 'Habakkuk',
    'zep': 'Zephaniah', 'zephaniah': 'Zephaniah',
    'hag': 'Haggai', 'haggai': 'Haggai',
    'zec': 'Zechariah', 'zechariah': 'Zechariah',
    'mal': 'Malachi', 'malachi': 'Malachi',
    'mat': 'Matthew', 'matthew': 'Matthew',
    'mar': 'Mark', 'mark': 'Mark',
    'luk': 'Luke', 'luke': 'Luke',
    'joh': 'John', 'john': 'John',
    'act': 'Acts', 'acts': 'Acts',
    'rom': 'Romans', 'romans': 'Romans',
    '1co': '1 Corinthians', '1 corinthians': '1 Corinthians',
    '2co': '2 Corinthians', '2 corinthians': '2 Corinthians',
    'gal': 'Galatians', 'galatians': 'Galatians',
    'eph': 'Ephesians', 'ephesians': 'Ephesians',
    'phi': 'Philippians', 'philippians': 'Philippians',
    'col': 'Colossians', 'colossians': 'Colossians',
    '1th': '1 Thessalonians', '1 thessalonians': '1 Thessalonians',
    '2th': '2 Thessalonians', '2 thessalonians': '2 Thessalonians',
    '1ti': '1 Timothy', '1 timothy': '1 Timothy',
    '2ti': '2 Timothy', '2 timothy': '2 Timothy',
    'tit': 'Titus', 'titus': 'Titus',
    'phm': 'Philemon', 'philemon': 'Philemon',
    'heb': 'Hebrews', 'hebrews': 'Hebrews',
    'jam': 'James', 'james': 'James',
    '1pe': '1 Peter', '1 peter': '1 Peter',
    '2pe': '2 Peter', '2 peter': '2 Peter',
    '1jo': '1 John', '1 john': '1 John',
    '2jo': '2 John', '2 john': '2 John',
    '3jo': '3 John', '3 john': '3 John',
    'jud': 'Jude', 'jude': 'Jude',
    'rev': 'Revelation', 'revelation': 'Revelation',
  };
  
  const normalized = input.toLowerCase().trim();
  return nameMap[normalized] || input;
}

/**
 * Get all Bible books (from local data - no API needed)
 */
export async function getBibleBooks() {
  return BIBLE_BOOKS;
}

/**
 * Fetch chapter from bible-api.com
 * Returns array of verses: [{ verse, text }]
 */
export async function getBibleVerses(bookName, chapter, translation = 'kjv') {
  if (!bookName || !chapter) return [];

  try {
    const response = await fetch(`${BIBLE_API_BASE}/${encodeURIComponent(bookName)}+${chapter}?translation=${translation}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chapter: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || !data.verses) {
      return [];
    }

    // Transform API response to match our format
    return data.verses.map(v => ({
      verse: v.verse || v.verse_number,
      text_kjv: v.text || '',
      text_tagalog: null, // API doesn't have Tagalog, will use KJV as fallback
      book_name: data.reference?.split(' ')[0] || bookName,
      chapter: chapter,
    }));
  } catch (error) {
    console.error('Failed to fetch Bible verses:', error.message);
    return [];
  }
}

/**
 * Search Bible verses by reference
 * Supports: "John 3:16", "Psalm 30:10-15", "Gen 1:1", "1 John 3:16"
 */
export async function searchBibleVerses(query) {
  if (!query || query.length < 2) return [];

  try {
    // Match verse range: "John 3:10-15" or "Psalm 30:10-15"
    const rangeMatch = query.match(/^([123]?\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+)\s*:\s*(\d+)\s*-\s*(\d+)$/i);
    if (rangeMatch) {
      const [, book, chapter, start, end] = rangeMatch;
      const verses = [];
      const normalizedBook = normalizeBookName(book);
      
      for (let v = parseInt(start); v <= parseInt(end); v++) {
        try {
          const response = await fetch(`${BIBLE_API_BASE}/${encodeURIComponent(normalizedBook)}+${chapter}:${v}?translation=kjv`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.verses && data.verses.length > 0) {
              verses.push({
                ...data.verses[0],
                book_name: normalizedBook,
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch verse ${normalizedBook} ${chapter}:${v}:`, err);
        }
      }
      
      return verses;
    }

    // Match single verse: "John 3:16" or "1 John 3:16"
    const singleMatch = query.match(/^([123]?\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(\d+)\s*:\s*(\d+)$/i);
    if (singleMatch) {
      const [, book, chapter, verse] = singleMatch;
      const normalizedBook = normalizeBookName(book);
      
      console.log(`Searching for: ${normalizedBook} ${chapter}:${verse}`);
      
      const response = await fetch(`${BIBLE_API_BASE}/${encodeURIComponent(normalizedBook)}+${chapter}:${verse}?translation=kjv`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        if (data && data.verses && data.verses.length > 0) {
          return data.verses.map(v => ({
            ...v,
            book_name: normalizedBook,
          }));
        }
      } else {
        console.error('API request failed:', response.statusText);
      }
    }

    // For word searches (not Bible references), return empty
    // Free API doesn't support full-text search
    return [];
  } catch (error) {
    console.error('Search failed:', error.message);
    return [];
  }
}

/**
 * Get user's favorite verses (stored in Supabase)
 */
export async function getFavoriteVerses() {
  const { data, error } = await supabase
    .from('bible_favorites')
    .select(`
      id,
      created_at,
      reference,
      text_kjv,
      text_tagalog
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch favorites:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Add a verse to favorites (stored as plain text in Supabase)
 */
export async function addFavoriteVerse(verse) {
  const { data, error } = await supabase
    .from('bible_favorites')
    .insert({
      reference: verse.reference,
      text_kjv: verse.text_kjv,
      text_tagalog: verse.text_tagalog || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Verse already in favorites');
    }
    throw new Error(error.message || 'Failed to add favorite');
  }

  return data;
}

/**
 * Remove a verse from favorites
 */
export async function removeFavoriteVerse(favoriteId) {
  const { error } = await supabase
    .from('bible_favorites')
    .delete()
    .eq('id', favoriteId);

  if (error) {
    throw new Error(error.message || 'Failed to remove favorite');
  }
}

/**
 * Check if verse is favorited
 */
export async function isVerseFavorited(reference) {
  const { data, error } = await supabase
    .from('bible_favorites')
    .select('id')
    .eq('reference', reference)
    .single();

  if (error) {
    return false;
  }

  return !!data;
}
