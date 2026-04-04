import { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, BarChart3, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, StatCard, Badge, Skeleton, EmptyState } from '../components/ui';
import { TIME_FILTERS, TIME_FILTER_LABELS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { getDevotionCount, getGroupDevotions } from '../services/devotions.service';
import GroupLeaderboard from './GroupLeaderboard';

export default function LeaderDashboard() {
  const { profile } = useAuth();
  const [timeFilter, setTimeFilter] = useState(TIME_FILTERS.MONTHLY);
  const [memberFilter, setMemberFilter] = useState('all');
  const [groupMembers, setGroupMembers] = useState([]);
  const [memberStats, setMemberStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);

  // Fetch group members and their stats
  async function fetchGroupData() {
    if (!profile?.group_id) return;

    setLoading(true);

    try {
      // Fetch group members
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('group_id', profile.group_id)
        .eq('role', 'member')
        .order('first_name');

      if (membersError) throw membersError;
      setGroupMembers(members || []);

      // Calculate date range based on filter
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

      // Get devotion count for each member
      const stats = await Promise.all(
        (members || []).map(async (member) => {
          const count = await getDevotionCount(member.id, startDate, now);
          return {
            ...member,
            devotionCount: count,
          };
        })
      );

      // Sort by count
      stats.sort((a, b) => b.devotionCount - a.devotionCount);
      setMemberStats(stats);
    } catch (err) {
      console.error('Failed to fetch group data:', err);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Fetch on mount and when filter changes
  useEffect(() => {
    if (profile?.group_id) {
      fetchGroupData();
    }
  }, [profile?.group_id, timeFilter]);

  // Filter stats by member
  const filteredStats = memberFilter === 'all'
    ? memberStats
    : memberStats.filter((m) => m.id === memberFilter);

  const totalDevotions = filteredStats.reduce((sum, m) => sum + m.devotionCount, 0);
  const activeMembers = filteredStats.filter((m) => m.devotionCount > 0).length;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Leader Dashboard 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {profile?.groups?.name || 'Your Group'} — Track your team&apos;s devotions
          </p>
        </div>
        <button
          onClick={fetchGroupData}
          className="btn-secondary"
        >
          <Filter className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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

        {/* Member Filter */}
        <select
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Members</option>
          {groupMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.first_name} {member.last_name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Group Members"
          value={groupMembers.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Total Devotions"
          value={totalDevotions}
          icon={Calendar}
          color="green"
        />
        <StatCard
          label="Active Members"
          value={activeMembers}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="Engagement Rate"
          value={
            groupMembers.length > 0
              ? `${Math.round((activeMembers / groupMembers.length) * 100)}%`
              : '0%'
          }
          icon={BarChart3}
          color="yellow"
        />
      </div>

      {/* Member Table */}
      <Card>
        <CardHeader
          title="Member Progress"
          subtitle={`${TIME_FILTER_LABELS[timeFilter]} overview`}
        />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : memberStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Member
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Devotions
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map((member, index) => (
                  <tr
                    key={member.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                            ? 'bg-gray-100 text-gray-600'
                            : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-lg font-bold text-gray-900">
                        {member.devotionCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {member.devotionCount > 0 ? (
                        <Badge color="green">Active</Badge>
                      ) : (
                        <Badge color="red">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No members found"
            description="Your group doesn't have any members yet."
          />
        )}
      </Card>

      {/* Group Leaderboard */}
      {profile?.group_id && <GroupLeaderboard />}
    </div>
  );
}
