import { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Filter, Star, Copy, Check, X, Loader2, AlertCircle, ChevronDown, Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getBibleBooks,
  getBibleVerses,
  getFavoriteVerses,
  addFavoriteVerse,
  removeFavoriteVerse,
} from '../services/bible.service';

export default function Bible() {
  const { user } = useAuth();

  // Refs for scrolling
  const versesContainerRef = useRef(null);
  const firstFilteredVerseRef = useRef(null);

  // State
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState([]);
  const [allVerses, setAllVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Version selector
  const [version, setVersion] = useState('kjv');
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  // Verse range filter
  const [showVerseFilter, setShowVerseFilter] = useState(true);
  const [filterChapter, setFilterChapter] = useState(1);
  const [startVerse, setStartVerse] = useState(1);
  const [endVerse, setEndVerse] = useState(1);
  const [verseInput, setVerseInput] = useState('');

  // Favorites
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoritingVerse, setFavoritingVerse] = useState(null);

  // Copied verse
  const [copiedVerse, setCopiedVerse] = useState(null);

  // Book dropdown
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  // Load Bible books on mount
  useEffect(() => {
    async function loadBooks() {
      const data = await getBibleBooks();
      setBooks(data);
      
      if (data.length > 0) {
        // Default to John chapter 3 (popular)
        const john = data.find(b => b.name === 'John') || data[42];
        if (john) {
          setSelectedBook(john);
          setSelectedChapter(3);
          setFilterChapter(3);
        }
      }
    }
    loadBooks();
  }, []);

  // Load verses when book or chapter changes
  useEffect(() => {
    if (!selectedBook) return;

    async function loadVerses() {
      setLoading(true);
      setError('');
      try {
        const data = await getBibleVerses(selectedBook.name, selectedChapter, version);
        setAllVerses(data);
        setVerses(data);
        setEndVerse(data.length > 0 ? data[data.length - 1].verse : 1);
        setStartVerse(1);
        
        if (data.length === 0) {
          setError(`No verses found for ${selectedBook.name} Chapter ${selectedChapter}. Please check your internet connection.`);
        }
      } catch (err) {
        setError('Failed to load verses. Please check your internet connection.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadVerses();
  }, [selectedBook, selectedChapter, version]);

  // Load favorites
  useEffect(() => {
    if (!user || !showFavorites) return;
    
    async function loadFavorites() {
      const data = await getFavoriteVerses();
      setFavorites(data);
    }
    loadFavorites();
  }, [user, showFavorites]);

  // Apply verse range filter
  function applyVerseRangeFilter(chapter, start, end) {
    if (!allVerses || allVerses.length === 0) return;
    
    const filtered = allVerses.filter(v => 
      v.chapter === chapter && v.verse >= start && v.verse <= end
    );
    
    setVerses(filtered);
    
    if (filtered.length === 0) {
      setError(`No verses found for ${selectedBook?.name} ${chapter}:${start}-${end}`);
    } else {
      setError('');
    }
  }

  // Handle filter submit
  function handleFilterSubmit() {
    if (!selectedBook) return;
    
    const start = Math.min(startVerse, endVerse);
    const end = Math.max(startVerse, endVerse);
    
    setVerseInput(`${selectedBook.name} ${filterChapter}:${start}-${end}`);
    applyVerseRangeFilter(filterChapter, start, end);
    
    // Scroll to verses
    setTimeout(() => {
      if (versesContainerRef.current) {
        versesContainerRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  }

  // Reset filter to show all verses
  function resetFilter() {
    setVerses(allVerses);
    setVerseInput('');
    setStartVerse(1);
    setEndVerse(allVerses.length > 0 ? allVerses[allVerses.length - 1].verse : 1);
    setError('');
  }

  // Chapter navigation
  function goToChapter(chapter) {
    if (chapter < 1 || chapter > selectedBook?.chapters) return;
    setSelectedChapter(chapter);
    setFilterChapter(chapter);
    setVerseInput('');
  }

  // Book selection
  function handleSelectBook(book) {
    setSelectedBook(book);
    setSelectedChapter(1);
    setFilterChapter(1);
    setVerseInput('');
  }

  // Copy verse to clipboard
  async function copyVerse(verse) {
    const text = `${verse.text_kjv} (${verse.book_name || selectedBook?.name} ${verse.chapter}:${verse.verse})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVerse(verse.verse);
      setTimeout(() => setCopiedVerse(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // Toggle favorite
  async function toggleFavorite(verse) {
    if (!user) return;
    
    setFavoritingVerse(verse.verse);
    try {
      const reference = `${verse.book_name || selectedBook?.name} ${verse.chapter}:${verse.verse}`;
      const alreadyFavorited = favorites.some(f => f.reference === reference);
      
      if (alreadyFavorited) {
        const fav = favorites.find(f => f.reference === reference);
        await removeFavoriteVerse(fav.id);
        setFavorites(prev => prev.filter(f => f.id !== fav.id));
      } else {
        await addFavoriteVerse({
          reference,
          text_kjv: verse.text_kjv,
          text_tagalog: verse.text_tagalog || null,
        });
        const updated = await getFavoriteVerses();
        setFavorites(updated);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setFavoritingVerse(null);
    }
  }

  // Check if verse is favorited
  function isFavorited(verse) {
    const reference = `${verse.book_name || selectedBook?.name} ${verse.chapter}:${verse.verse}`;
    return favorites.some(f => f.reference === reference);
  }

  // Render ALL chapter buttons
  function renderChapterButtons() {
    if (!selectedBook) return null;
    
    const chapters = [];
    
    for (let i = 1; i <= selectedBook.chapters; i++) {
      const isActive = i === selectedChapter;
      chapters.push(
        <button
          key={i}
          onClick={() => goToChapter(i)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return chapters;
  }

  // Generate verse options for dropdown
  function getVerseOptions(maxVerse) {
    const options = [];
    for (let i = 1; i <= maxVerse; i++) {
      options.push(i);
    }
    return options;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bible</h1>
              <p className="text-sm text-gray-500">Read and study God's Word (Powered by bible-api.com)</p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Book Selector */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <button
                onClick={() => setShowBookDropdown(!showBookDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-gray-400"
              >
                <span>{selectedBook?.name || 'Select Book'}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {showBookDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {/* Old Testament */}
                  <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0">
                    Old Testament
                  </div>
                  {books.filter(b => b.testament === 'OT').map(book => (
                    <button
                      key={book.id}
                      onClick={() => handleSelectBook(book)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        selectedBook?.id === book.id ? 'bg-primary-50 text-primary-700' : ''
                      }`}
                    >
                      {book.name}
                    </button>
                  ))}
                  {/* New Testament */}
                  <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0">
                    New Testament
                  </div>
                  {books.filter(b => b.testament === 'NT').map(book => (
                    <button
                      key={book.id}
                      onClick={() => handleSelectBook(book)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        selectedBook?.id === book.id ? 'bg-primary-50 text-primary-700' : ''
                      }`}
                    >
                      {book.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Version Selector */}
            <div className="relative">
              <button
                onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400"
              >
                {version === 'kjv' ? 'KJV' : version.toUpperCase()}
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {showVersionDropdown && (
                <div className="absolute z-20 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <button
                    onClick={() => { setVersion('kjv'); setShowVersionDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                      version === 'kjv' ? 'bg-primary-50 text-primary-700' : ''
                    }`}
                  >
                    KJV (English)
                  </button>
                  <button
                    onClick={() => { setVersion('web'); setShowVersionDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                      version === 'web' ? 'bg-primary-50 text-primary-700' : ''
                    }`}
                  >
                    WEB (English)
                  </button>
                  <button
                    onClick={() => { setVersion('bbe'); setShowVersionDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                      version === 'bbe' ? 'bg-primary-50 text-primary-700' : ''
                    }`}
                  >
                    BBE (English)
                  </button>
                </div>
              )}
            </div>

            {/* Verse Range Filter Toggle */}
            <button
              onClick={() => setShowVerseFilter(!showVerseFilter)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showVerseFilter
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter Verses
            </button>

            {/* Favorites Toggle */}
            <button
              onClick={() => {
                setShowFavorites(!showFavorites);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFavorites
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Star className={`w-4 h-4 ${showFavorites ? 'fill-yellow-500' : ''}`} />
              Favorites
            </button>
          </div>
        </div>
      </div>

      {/* Verse Range Filter Panel */}
      {showVerseFilter && selectedBook && (
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Verse Range</h3>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Book */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={selectedBook?.id || ''}
                  onChange={(e) => {
                    const book = books.find(b => b.id === parseInt(e.target.value, 10));
                    if (book) {
                      setSelectedBook(book);
                      setSelectedChapter(1);
                      setFilterChapter(1);
                      setStartVerse(1);
                      setEndVerse(1);
                    }
                  }}
                  className="input-field"
                >
                  {books.map(book => (
                    <option key={book.id} value={book.id}>{book.name}</option>
                  ))}
                </select>
              </div>

              {/* Chapter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                <select
                  value={filterChapter}
                  onChange={(e) => {
                    const ch = parseInt(e.target.value, 10);
                    setFilterChapter(ch);
                    setSelectedChapter(ch);
                    setStartVerse(1);
                    setEndVerse(1);
                  }}
                  className="input-field"
                >
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>
              </div>

              {/* Start Verse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Verse</label>
                <select
                  value={startVerse}
                  onChange={(e) => setStartVerse(parseInt(e.target.value, 10))}
                  className="input-field"
                >
                  {getVerseOptions(150).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* End Verse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Verse</label>
                <select
                  value={endVerse}
                  onChange={(e) => setEndVerse(parseInt(e.target.value, 10))}
                  className="input-field"
                >
                  {getVerseOptions(150).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleFilterSubmit}
                className="btn-primary"
              >
                Apply Filter & Jump to Verse
              </button>
              <button
                onClick={resetFilter}
                className="btn-secondary"
              >
                Show All Verses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorites View */}
      {showFavorites && (
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">My Favorites</h2>
            {favorites.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No favorite verses yet</p>
                <p className="text-sm text-gray-400 mt-1">Click the bookmark icon on any verse to save it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {favorites.map((fav) => (
                  <div key={fav.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary-700 mb-1">
                          {fav.reference}
                        </p>
                        <p className="text-sm text-gray-900">
                          {fav.text_kjv}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFavoriteVerse(fav.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Chapter View */}
      {!showFavorites && selectedBook && (
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
          {/* Chapter Navigation - ALL chapters shown */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Chapters ({selectedBook.chapters} total)
            </h3>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {renderChapterButtons()}
            </div>
          </div>

          {/* Current Selection Info */}
          {verseInput && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Showing: {verseInput}
                </p>
                <p className="text-xs text-blue-700">{verses.length} verse{verses.length !== 1 ? 's' : ''} displayed</p>
              </div>
              <button
                onClick={resetFilter}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Show All
              </button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Verses Display */}
          <div 
            ref={versesContainerRef}
            className="bg-white rounded-lg border border-gray-200 p-6"
          >
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
                <p className="text-gray-500">Loading {selectedBook.name} Chapter {selectedChapter}...</p>
              </div>
            ) : verses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No verses available for this chapter</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedBook.name} - Chapter {selectedChapter}
                  {verseInput && (
                    <span className="text-base font-normal text-gray-500 ml-2">
                      (Verses {startVerse}–{endVerse})
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {version === 'kjv' ? 'King James Version' : version === 'web' ? 'World English Bible' : 'Bible in Basic English'}
                </p>
                <div className="space-y-4">
                  {verses.map((verse, index) => {
                    const isFav = isFavorited(verse);
                    const isCopying = copiedVerse === verse.verse;
                    const isFirstFiltered = index === 0 && verseInput;

                    return (
                      <div
                        key={verse.verse}
                        ref={isFirstFiltered ? firstFilteredVerseRef : null}
                        className={`p-4 rounded-lg border-2 bg-gray-50 border-gray-200 hover:border-gray-300 transition-all ${
                          isFirstFiltered ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-bold text-primary-600 flex-shrink-0 mt-0.5">
                            {verse.verse}
                          </span>
                          <p className="flex-1 text-gray-900 leading-relaxed">
                            {verse.text_kjv}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => toggleFavorite(verse)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isFav
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : 'bg-gray-200 text-gray-500 hover:bg-yellow-100'
                              }`}
                              disabled={favoritingVerse === verse.verse}
                              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              {favoritingVerse === verse.verse ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Bookmark className={`w-4 h-4 ${isFav ? 'fill-yellow-500' : ''}`} />
                              )}
                            </button>
                            <button
                              onClick={() => copyVerse(verse)}
                              className="p-1.5 rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
                              title="Copy verse"
                            >
                              {isCopying ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
