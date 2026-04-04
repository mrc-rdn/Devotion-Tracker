import { useState } from 'react';
import { Calendar, TrendingUp, Award, Users, ChevronUp, ChevronDown } from 'lucide-react';
import { useDevotions } from '../hooks/useDevotions';
import { useAuth } from '../contexts/AuthContext';
import DevotionCalendar from '../components/calendar/DevotionCalendar';
import { Card, CardHeader, StatCard, Badge, Skeleton } from '../components/ui';
import { TIME_FILTERS, TIME_FILTER_LABELS } from '../lib/constants';
import GroupLeaderboard from './GroupLeaderboard';

export default function MemberDashboard() {
  const { profile } = useAuth();
  const { stats, leaderboard, loading } = useDevotions(
    new Date().getFullYear(),
    new Date().getMonth()
  );
  const [timeFilter, setTimeFilter] = useState(TIME_FILTERS.MONTHLY);
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);

  // Get stat value based on filter
  function getStatValue(statKey) {
    if (!stats) return 0;
    return stats[statKey] || 0;
  }

  // Calculate streak (simplified)
  function calculateStreak() {
    if (!stats) return 0;
    // A more sophisticated implementation would check consecutive days
    // For now, use weekly count as a proxy
    return stats.weekly > 0 ? stats.weekly : 0;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.first_name}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Track your daily devotion journey</p>
      </div>

      {/* Time Filter */}
      <div className="flex items-center gap-2">
        {Object.values(TIME_FILTERS).map((filter) => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeFilter === filter
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {TIME_FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <Skeleton className="h-16 w-full" />
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              label="This Week"
              value={getStatValue('weekly')}
              icon={Calendar}
              color="green"
            />
            <StatCard
              label="This Month"
              value={getStatValue('monthly')}
              icon={TrendingUp}
              color="blue"
            />
            <StatCard
              label="This Year"
              value={getStatValue('yearly')}
              icon={Award}
              color="purple"
            />
            <StatCard
              label="Current Streak"
              value={`${calculateStreak()} days`}
              icon={Users}
              color="yellow"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Devotion Calendar"
              subtitle="Green = Submitted | Red = Missing"
            />
            <DevotionCalendar />
          </Card>
        </div>

        {/* Leaderboard */}
        <div>
          {profile?.group_id ? (
            <GroupLeaderboard />
          ) : (
            <Card>
              <CardHeader
                title="Leaderboard"
                subtitle="Join a group to see rankings"
              />
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No group assigned</p>
                <p className="text-xs text-gray-400 mt-1">
                  Go to &quot;Join Group&quot; in the sidebar to get started
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
