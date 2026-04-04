import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader } from '../components/ui';
import DevotionCalendar from '../components/calendar/DevotionCalendar';
import { useDevotions } from '../hooks/useDevotions';
import { Calendar, TrendingUp, Award, Users } from 'lucide-react';
import { StatCard, Skeleton } from '../components/ui';
import { useState } from 'react';
import { TIME_FILTERS, TIME_FILTER_LABELS } from '../lib/constants';

export default function MyDevotion() {
  const { profile } = useAuth();
  const { stats, loading } = useDevotions(
    new Date().getFullYear(),
    new Date().getMonth()
  );
  const [timeFilter, setTimeFilter] = useState(TIME_FILTERS.MONTHLY);

  function getStatValue(statKey) {
    if (!stats) return 0;
    return stats[statKey] || 0;
  }

  function calculateStreak() {
    if (!stats) return 0;
    return stats.weekly > 0 ? stats.weekly : 0;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My Devotion 📖
        </h1>
        <p className="text-gray-500 mt-1">Track and submit your daily devotion journal</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Devotion Calendar with Upload */}
      <Card>
        <CardHeader
          title="Devotion Calendar"
          subtitle="Green = Submitted | Red = Missing"
        />
        <DevotionCalendar />
      </Card>
    </div>
  );
}
