import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, CheckCircle, AlertCircle, LogOut, Loader2, Crown, ChevronRight, X, ArrowRight, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Button, Badge } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import {
  searchGroups,
  joinGroup,
  leaveGroup,
  getGroupLeaders,
  getUserGroups,
} from '../services/groups.service';

export default function JoinGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // My Groups State
  const [myGroups, setMyGroups] = useState([]);
  const [loadingMyGroups, setLoadingMyGroups] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Action State
  const [joining, setJoining] = useState(null); // Stores groupId being joined
  const [leaving, setLeaving] = useState(null); // Stores groupId being left
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown UI State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debouncedQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchIdRef = useRef(0);

  // Fetch user's groups on mount
  useEffect(() => {
    async function loadMyGroups() {
      if (!user?.id) return;
      setLoadingMyGroups(true);
      try {
        const groups = await getUserGroups(user.id);
        setMyGroups(groups);
      } catch (err) {
        console.error('Failed to load user groups:', err);
      } finally {
        setLoadingMyGroups(false);
      }
    }
    loadMyGroups();
  }, [user?.id]);

  // Live search
  useEffect(() => {
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

        // Filter out groups the user is already in
        const myGroupIds = new Set(myGroups.map(g => g.id));
        const filteredResults = results.filter(g => !myGroupIds.has(g.id));

        if (searchIdRef.current === currentSearchId) {
          setSearchResults(filteredResults);
          setDropdownOpen(true);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        if (searchIdRef.current === currentSearchId) {
          console.error('Search failed:', err);
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
  }, [debouncedQuery, myGroups]);

  // Close dropdown on outside click
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
        e.preventDefault();
        if (searchResults.length > 0) {
          handleSelectSuggestion(searchResults[0]);
        }
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
    setJoining(groupId);
    setError('');
    setSuccess('');
    setDropdownOpen(false);

    try {
      await joinGroup(groupId);
      setSuccess('Successfully joined the group!');
      setSearchQuery('');
      setSearchResults([]);

      // Refresh my groups list
      if (user?.id) {
        const groups = await getUserGroups(user.id);
        setMyGroups(groups);
      }
    } catch (err) {
      setError(err.message || 'Failed to join group');
    } finally {
      setJoining(null);
    }
  }

  // Leave a group
  async function handleLeave(groupId) {
    if (!confirm('Are you sure you want to leave this group?')) return;

    setLeaving(groupId);
    setError('');
    setSuccess('');

    try {
      await leaveGroup(groupId);
      setSuccess('You have left the group.');

      // Refresh my groups list
      if (user?.id) {
        const groups = await getUserGroups(user.id);
        setMyGroups(groups);
      }
    } catch (err) {
      setError(err.message || 'Failed to leave group');
    } finally {
      setLeaving(null);
    }
  }

  // Check if a group is already joined (for search results highlighting if needed)
  const isJoined = (groupId) => myGroups.some(g => g.id === groupId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
        <p className="text-gray-500 mt-1">Manage your group memberships and find new groups</p>
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

      {/* My Groups List */}
      <Card>
        <CardHeader
          title="Groups You've Joined"
          subtitle={`${myGroups.length} group${myGroups.length !== 1 ? 's' : ''}`}
        />

        {loadingMyGroups ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : myGroups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">You haven't joined any groups yet.</p>
            <p className="text-sm text-gray-400 mt-1">Search below to find a group!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myGroups.map((group) => {
              // Co-Leaders and Leaders (owners) can view group details
              const canViewDetails = group.role === 'owner' || group.role === 'leader';

              return (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{group.name}</p>
                      <Badge color={group.role === 'owner' ? 'purple' : group.role === 'leader' ? 'blue' : 'green'}>
                        {group.role === 'owner' ? 'Leader' : group.role === 'leader' ? 'Co-Leader' : 'Member'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {/* View Details Button - Only for Co-Leaders and Leaders */}
                    {canViewDetails && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/member/group/${group.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={leaving === group.id}
                      onClick={() => handleLeave(group.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      Leave
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Find New Groups */}
      <Card>
        <CardHeader
          title="Find a New Group"
          subtitle="Search for groups to join"
        />

        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search groups by name..."
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
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Dropdown Results */}
          {dropdownOpen && searchQuery.length >= 2 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {searching ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching groups...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">No new groups found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    You may have already joined matching groups.
                  </p>
                </div>
              ) : (
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
                          disabled={joining === group.id}
                          className={`w-full text-left px-4 py-4 transition-colors border-b border-gray-100 last:border-0 ${
                            isHighlighted
                              ? 'bg-primary-50 border-l-4 border-primary-500'
                              : 'hover:bg-gray-50 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{group.name}</p>
                              {group.description && (
                                <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                              )}
                              {group.leaders?.length > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                  <span className="text-xs text-gray-500">
                                    Led by {group.leaders.map(l => l.first_name).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              {joining === group.id ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                              ) : (
                                <ArrowRight className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  <li className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                    {searchResults.length} group{searchResults.length !== 1 ? 's' : ''} found — click to join
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {!searchQuery && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> You can join multiple groups! Search by name to find new communities.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
