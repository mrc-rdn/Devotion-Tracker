import { useState, useEffect, useRef } from 'react';
import { Trophy, TrendingUp, ChevronUp, ChevronDown, RefreshCw, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Badge, Skeleton } from '../components/ui';
import {
  getGroupLeaderboard,
  subscribeToGroupDevotions,
  unsubscribeChannel,
} from '../services/groups.service';
import { TIME_FILTERS, TIME_FILTER_LABELS } from '../lib/constants';

export default function GroupLeaderboard({ userGroups = [], selectedGroupId, onSelectGroup }) {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState(TIME_FILTERS.MONTHLY);
  const [expanded, setExpanded] = useState(false);
  const channelRef = useRef(null);

  // Debug: Log props received
  useEffect(() => {
    console.log('📦 GroupLeaderboard props:', { 
      selectedGroupId, 
      profileGroupId: profile?.groupId,
      userGroupsCount: userGroups.length,
      userGroups: userGroups.map(g => ({ id: g.id, name: g.name }))
    });
  }, [selectedGroupId, profile?.groupId, userGroups]);

  // Use prop directly, fallback to profile groupId
  const groupId = selectedGroupId ?? profile?.groupId ?? null;

  function getDateRange() {
    const now = new Date();
    let startDateStr, endDateStr;

    // Get current date components in local time
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();
    const dayOfWeek = now.getDay(); // 0 = Sunday

    if (timeFilter === TIME_FILTERS.WEEKLY) {
      // Calculate days since Monday
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(day - daysSinceMonday);
      
      // Format as YYYY-MM-DD directly
      const startYear = monday.getFullYear();
      const startMonth = String(monday.getMonth() + 1).padStart(2, '0');
      const startDay = String(monday.getDate()).padStart(2, '0');
      startDateStr = `${startYear}-${startMonth}-${startDay}`;
      
      const endYear = now.getFullYear();
      const endMonth = String(now.getMonth() + 1).padStart(2, '0');
      const endDay = String(now.getDate()).padStart(2, '0');
      endDateStr = `${endYear}-${endMonth}-${endDay}`;
    } else if (timeFilter === TIME_FILTERS.MONTHLY) {
      // First of month
      startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      // Last day of month
      const lastDay = new Date(year, month + 1, 0).getDate();
      endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // Yearly
      startDateStr = `${year}-01-01`;
      endDateStr = `${year}-12-31`;
    }

    return { startDateStr, endDateStr };
  }

  async function fetchLeaderboard() {
    if (!groupId) {
      console.log('⚠️ No groupId provided to GroupLeaderboard');
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    console.log('🔍 Fetching leaderboard for group:', groupId);
    setLoading(true);
    try {
      const { startDateStr, endDateStr } = getDateRange();
      console.log('📅 Date range (strings):', startDateStr, 'to', endDateStr);
      
      // Pass date strings directly to service
      const data = await getGroupLeaderboard(groupId, startDateStr, endDateStr);
      
      console.log('✅ Leaderboard data fetched:', data?.length, 'members');
      if (data && data.length > 0) {
        console.log('📊 Sample member:', data[0]);
      }
      setLeaderboard(data || []);
    } catch (err) {
      console.error('❌ Failed to fetch leaderboard:', err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch data when groupId or timeFilter changes
  useEffect(() => {
    if (!groupId) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }
    
    fetchLeaderboard();
    
    // Subscribe to realtime devotion changes
    channelRef.current = subscribeToGroupDevotions(groupId, () => {
      console.log('🔄 Realtime update triggered');
      fetchLeaderboard();
    });

    return () => {
      unsubscribeChannel(channelRef.current);
    };
  }, [groupId, timeFilter]);

  function handleGroupChange(e) {
    const newGroupId = e.target.value || null;
    console.log('🔄 Group changed to:', newGroupId);
    if (onSelectGroup) {
      onSelectGroup(newGroupId);
    }
  }

  // Get current group name
  const currentGroup = userGroups.find(g => g.id === groupId);
  const groupName = currentGroup?.name || profile?.groupName || 'Your Group';

  const displayData = expanded ? leaderboard : leaderboard.slice(0, 5);
  const totalDevotions = leaderboard.reduce((sum, m) => sum + m.devotionCount, 0);
  const activeMembers = leaderboard.filter((m) => m.devotionCount > 0).length;

  function getMedalColor(index) {
    if (index === 0) return 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300';
    if (index === 1) return 'bg-gray-100 text-gray-600 border-2 border-gray-300';
    if (index === 2) return 'bg-orange-100 text-orange-700 border-2 border-orange-300';
    return 'bg-gray-50 text-gray-500 border border-gray-200';
  }

  function getRoleBadge(role) {
    return role === 'leader' ? 'blue' : 'green';
  }

  if (!groupId) {
    return (
      <Card>
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No group selected</p>
          <p className="text-xs text-gray-500 mt-1">
            Select a group to view the leaderboard
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Group Leaderboard"
        subtitle={`${groupName} — ${TIME_FILTER_LABELS[timeFilter]}`}
        action={
          <button
            onClick={fetchLeaderboard}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        {/* Time Filter */}
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded">
          {Object.values(TIME_FILTERS).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1 rounded text-[10px] uppercase tracking-wider font-bold transition-all ${
                timeFilter === filter
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {TIME_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>

        {/* Group Filter */}
        {userGroups.length > 1 && (
          <select
            value={groupId || ''}
            onChange={handleGroupChange}
            className="bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
          >
            {userGroups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{leaderboard.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Members</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{totalDevotions}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Devotions</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-primary-600">{activeMembers}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
        </div>
      </div>

      {/* Leaderboard List */}
      {loading ? (
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="p-2">
          {displayData.map((member, index) => {
            const isCurrentUser = profile?.id === member.id;
            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 py-3 px-3 rounded-lg transition-colors ${
                  isCurrentUser ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getMedalColor(index)}`}>
                  {index < 3 ? (
                    <Trophy className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {member.first_name} {member.last_name}
                      {isCurrentUser && (
                        <span className="ml-1 text-xs text-primary-600">(You)</span>
                      )}
                    </p>
                    {member.role === 'leader' && (
                      <Crown className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>
                  <Badge color={getRoleBadge(member.role)}>
                    {member.role}
                  </Badge>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{member.devotionCount}</p>
                  <p className="text-xs text-gray-500">devotions</p>
                </div>
              </div>
            );
          })}

          {leaderboard.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium w-full justify-center py-2"
            >
              {expanded ? (
                <>
                  Show top 5 <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  View all ({leaderboard.length}) <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No data yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Devotions will appear here as members submit
          </p>
        </div>
      )}
    </Card>
  );
}
