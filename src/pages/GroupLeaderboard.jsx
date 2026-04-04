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

export default function GroupLeaderboard() {
  const { profile } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState(TIME_FILTERS.MONTHLY);
  const [expanded, setExpanded] = useState(false);
  const channelRef = useRef(null);

  // Calculate date range
  function getDateRange() {
    const now = new Date();
    let startDate;
    if (timeFilter === TIME_FILTERS.WEEKLY) {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
    } else if (timeFilter === TIME_FILTERS.MONTHLY) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    return { startDate, endDate: now };
  }

  // Fetch leaderboard
  async function fetchLeaderboard() {
    if (!profile?.group_id) return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const data = await getGroupLeaderboard(profile.group_id, startDate, endDate);
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  // Setup realtime subscription
  useEffect(() => {
    if (!profile?.group_id) return;

    // Initial fetch
    fetchLeaderboard();

    // Subscribe to realtime devotion changes
    channelRef.current = subscribeToGroupDevotions(
      profile.group_id,
      () => {
        // Refresh leaderboard when a new devotion is submitted
        fetchLeaderboard();
      }
    );

    return () => {
      unsubscribeChannel(channelRef.current);
    };
  }, [profile?.group_id, timeFilter]);

  // Re-fetch when time filter changes
  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter]);

  // Get medal color
  function getMedalColor(index) {
    if (index === 0) return 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300';
    if (index === 1) return 'bg-gray-100 text-gray-600 border-2 border-gray-300';
    if (index === 2) return 'bg-orange-100 text-orange-700 border-2 border-orange-300';
    return 'bg-gray-50 text-gray-500 border border-gray-200';
  }

  // Get role badge color
  function getRoleBadge(role) {
    return role === 'leader' ? 'blue' : 'green';
  }

  const displayData = expanded ? leaderboard : leaderboard.slice(0, 5);
  const totalDevotions = leaderboard.reduce((sum, m) => sum + m.devotionCount, 0);
  const activeMembers = leaderboard.filter((m) => m.devotionCount > 0).length;

  return (
    <Card>
      <CardHeader
        title="Group Leaderboard"
        subtitle={`${profile?.groups?.name || 'Your Group'} — ${TIME_FILTER_LABELS[timeFilter]}`}
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

      {/* Time Filter */}
      <div className="flex items-center gap-2 mb-4">
        {Object.values(TIME_FILTERS).map((filter) => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              timeFilter === filter
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {TIME_FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">{leaderboard.length}</p>
          <p className="text-xs text-gray-500">Members</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">{totalDevotions}</p>
          <p className="text-xs text-gray-500">Devotions</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-primary-600">{activeMembers}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
      </div>

      {/* Leaderboard List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : leaderboard.length > 0 ? (
        <div>
          {displayData.map((member, index) => {
            const isCurrentUser = profile?.id === member.id;
            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 py-3 px-3 rounded-lg transition-colors ${
                  isCurrentUser ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50'
                }`}
              >
                {/* Rank / Medal */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getMedalColor(index)}`}>
                  {index < 3 ? (
                    <Trophy className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Member Info */}
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

                {/* Devotion Count */}
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{member.devotionCount}</p>
                  <p className="text-xs text-gray-500">devotions</p>
                </div>
              </div>
            );
          })}

          {/* Expand/Collapse */}
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
