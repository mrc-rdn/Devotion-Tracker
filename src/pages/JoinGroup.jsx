import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users, CheckCircle, AlertCircle, LogOut, Loader2, Crown, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Button, Badge, EmptyState } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import {
  searchGroups,
  joinGroup,
  leaveGroup,
  getGroupLeaders,
} from '../services/groups.service';

export default function JoinGroup() {
  const { profile, updateProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groupLeaders, setGroupLeaders] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debouncedQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchIdRef = useRef(0);

  const isInGroup = !!profile?.group_id;

  // Live search: fires when debounced query changes
  useEffect(() => {
    // Only search if query is long enough
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }

    async function performSearch() {
      const currentSearchId = ++searchIdRef.current;
      setSearching(true);

      try {
        const results = await searchGroups(debouncedQuery);

        // Only update if this is still the latest search
        if (searchIdRef.current === currentSearchId) {
          setSearchResults(results);
          setDropdownOpen(true);
          setHighlightedIndex(-1);

          if (results.length === 0) {
            setError('No groups found');
          } else {
            setError('');
          }
        }
      } catch (err) {
        if (searchIdRef.current === currentSearchId) {
          setError('Failed to search groups');
          setSearchResults([]);
          setDropdownOpen(false);
        }
      } finally {
        if (searchIdRef.current === currentSearchId) {
          setSearching(false);
        }
      }
    }

    performSearch();
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Highlight a suggestion
  const handleSelectSuggestion = useCallback((group) => {
    setSearchQuery(group.name);
    setSearchResults([]);
    setDropdownOpen(false);
    handleJoin(group.id);
  }, []);

  // Keyboard navigation
  function handleKeyDown(e) {
    if (!dropdownOpen || searchResults.length === 0) {
      if (e.key === 'Enter' && searchQuery.length >= 2) {
        // Submit search
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          handleSelectSuggestion(searchResults[highlightedIndex]);
        }
        break;

      case 'Escape':
        setDropdownOpen(false);
        setHighlightedIndex(-1);
        break;

      default:
        break;
    }
  }

  // Join a group
  async function handleJoin(groupId) {
    setJoining(true);
    setError('');
    setSuccess('');
    setDropdownOpen(false);

    try {
      await joinGroup(groupId);

      // Refresh profile
      const { supabase } = await import('../lib/supabase');
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*, groups(name)')
        .eq('id', profile.id)
        .single();

      if (updatedProfile) {
        await updateProfile({});
      }

      setSuccess('Successfully joined the group!');
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setError(err.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  }

  // Leave current group
  async function handleLeave() {
    if (!confirm('Are you sure you want to leave your group?')) return;

    setLeaving(true);
    setError('');
    setSuccess('');

    try {
      await leaveGroup();
      await updateProfile({});
      setSuccess('You have left the group.');
      setGroupLeaders([]);
    } catch (err) {
      setError(err.message || 'Failed to leave group');
    } finally {
      setLeaving(false);
    }
  }

  // Load current group leaders
  async function loadGroupLeaders() {
    if (!profile?.group_id) return;

    try {
      const leaders = await getGroupLeaders(profile.group_id);
      setGroupLeaders(leaders);
    } catch (err) {
      console.error('Failed to load group leaders:', err);
    }
  }

  // Load leaders on mount
  useEffect(() => {
    if (profile?.group_id) {
      loadGroupLeaders();
    }
  }, [profile?.group_id]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const item = document.getElementById(`suggestion-${highlightedIndex}`);
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <p className="text-gray-500 mt-1">
          {isInGroup ? 'Manage your group membership' : 'Find and join a group'}
        </p>
      </div>

      {/* Success/Error */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Current Group Info */}
      {isInGroup && (
        <Card>
          <CardHeader
            title="Your Group"
            subtitle={profile?.groups?.name || 'Loading...'}
            action={
              <Button
                variant="secondary"
                loading={leaving}
                onClick={handleLeave}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Group
              </Button>
            }
          />

          <div className="space-y-4">
            <div className="p-4 bg-primary-50 rounded-lg">
              <p className="font-semibold text-primary-900">{profile?.groups?.name}</p>
              <Badge color="green">Member</Badge>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Group Leader{groupLeaders.length > 1 ? 's' : ''}
              </h4>
              {groupLeaders.length > 0 ? (
                <div className="space-y-2">
                  {groupLeaders.map((leader) => (
                    <div
                      key={leader.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                        {leader.first_name[0]}
                        {leader.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {leader.first_name} {leader.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{leader.email}</p>
                      </div>
                      <Badge color="blue">Leader</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No leaders assigned yet</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Live Search & Join Group */}
      {!isInGroup && (
        <Card>
          <CardHeader
            title="Find a Group"
            subtitle="Start typing to search groups by name"
          />

          {/* Search Input with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search groups..."
                className="input-field pl-9 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (searchResults.length > 0 && searchQuery.length >= 2) {
                    setDropdownOpen(true);
                  }
                }}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setDropdownOpen(false);
                    setError('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {dropdownOpen && searchQuery.length >= 2 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {/* Loading State */}
                {searching && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching groups...
                  </div>
                )}

                {/* No Results */}
                {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <div className="px-4 py-8 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">No groups found</p>
                    <p className="text-xs text-gray-500 mt-1">
                      No groups match &quot;{searchQuery}&quot;
                    </p>
                  </div>
                )}

                {/* Suggestions List */}
                {!searching && searchResults.length > 0 && (
                  <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                    {searchResults.map((group, index) => {
                      const isHighlighted = index === highlightedIndex;
                      return (
                        <li key={group.id}>
                          <button
                            id={`suggestion-${index}`}
                            type="button"
                            onClick={() => handleSelectSuggestion(group)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full text-left px-4 py-4 transition-colors border-b border-gray-100 last:border-0 ${
                              isHighlighted
                                ? 'bg-primary-50 border-l-4 border-primary-500'
                                : 'hover:bg-gray-50 border-l-4 border-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                {/* Group Name */}
                                <p className="text-sm font-semibold text-gray-900">
                                  {group.name}
                                </p>

                                {/* Group Description */}
                                {group.description && (
                                  <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                                )}

                                {/* Group Leaders */}
                                {group.leaders && group.leaders.length > 0 && (
                                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                    <span className="text-xs text-gray-600 font-medium">
                                      Leader{group.leaders.length > 1 ? 's' : ''}:
                                    </span>
                                    {group.leaders.map((leader, idx) => (
                                      <span key={leader.id} className="text-xs text-gray-700">
                                        {leader.first_name} {leader.last_name}
                                        {idx < group.leaders.length - 1 && ', '}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* No Leaders */}
                                {(!group.leaders || group.leaders.length === 0) && (
                                  <p className="text-xs text-gray-400 mt-2">
                                    No leaders assigned yet
                                  </p>
                                )}
                              </div>

                              {/* Join Icon */}
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                            </div>
                          </button>
                        </li>
                      );
                    })}

                    {/* Footer */}
                    <li className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-400 text-center">
                        {searchResults.length} group{searchResults.length !== 1 ? 's' : ''} found — click to join
                      </p>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Hint */}
          {!searchQuery && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> Start typing a group name to see suggestions. 
                Use arrow keys to navigate and Enter to select.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
