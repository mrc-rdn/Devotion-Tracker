import { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, BarChart3, Filter, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDevotions } from '../hooks/useDevotions';
import { Card, StatCard } from '../components/ui';
import { TIME_FILTERS, TIME_FILTER_LABELS } from '../lib/constants';
import { getDevotionCount } from '../services/devotions.service';
import { getGroupMembers } from '../services/groups.service';
import GroupLeaderboard from './GroupLeaderboard';

export default function LeaderDashboard() {
  const { profile } = useAuth();
  const [timeFilter, setTimeFilter] = useState(TIME_FILTERS.MONTHLY);
  const [memberFilter, setMemberFilter] = useState('all');
  const [groupMembers, setGroupMembers] = useState([]);
  const [memberStats, setMemberStats] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchGroupData() {
    if (!profile?.groupId) return;
    setLoading(true);
    try {
      const members = await getGroupMembers(profile.groupId);
      setGroupMembers(members || []);
      const now = new Date();
      let startDate = timeFilter === TIME_FILTERS.WEEKLY 
        ? new Date(now.setDate(now.getDate() - now.getDay())) 
        : new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats = await Promise.all(members.map(async (member) => {
        const count = await getDevotionCount(member.id, startDate, now);
        return { ...member, devotionCount: count };
      }));
      setMemberStats(stats.sort((a, b) => b.devotionCount - a.devotionCount));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (profile?.groupId) fetchGroupData(); }, [profile?.groupId, timeFilter]);

  const filteredStats = memberFilter === 'all' ? memberStats : memberStats.filter(m => m.id === memberFilter);
  const totalDevotions = filteredStats.reduce((sum, m) => sum + m.devotionCount, 0);
  const activeMembers = filteredStats.filter(m => m.devotionCount > 0).length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 ">
      {/* Unified Header Style */}
      <div className="relative overflow-hidden bg-[#1a365d] rounded-sm p-8 text-white shadow-lg">
        <h1 className="text-3xl font-extrabold uppercase tracking-tight">Leader Dashboard</h1>
        <p className="text-blue-100/70 mt-2 text-sm">Overseeing the growth of {profile?.groupName || 'your fellowship'}</p>
      </div>

      {/* Unified Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 border border-slate-100 shadow-sm rounded-sm">
        <div className="flex bg-slate-100 p-1 rounded-sm">
          {Object.values(TIME_FILTERS).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all ${
                timeFilter === filter ? 'bg-[#1a365d] text-white' : 'text-slate-500 hover:text-[#1a365d]'
              }`}
            >
              {TIME_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
        
        <select 
          onChange={(e) => setMemberFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-600 focus:outline-none"
        >
          <option value="all">All Members</option>
          {groupMembers.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
        </select>
      </div>

      {/* Stats Grid matching Member View style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardComponent label="Members" value={groupMembers.length} icon={Users} color="blue" />
        <StatCardComponent label="Total Devotions" value={totalDevotions} icon={Calendar} color="emerald" />
        <StatCardComponent label="Active Souls" value={activeMembers} icon={TrendingUp} color="indigo" />
        <StatCardComponent label="Engagement" value={groupMembers.length > 0 ? `${Math.round((activeMembers/groupMembers.length)*100)}%` : '0%'} icon={BarChart3} color="amber" />
      </div>

      {/* Leaderboard Section */}
      <div className='w-full flex flex-col sm:flex-rows gap-10'>
        <div className="bg-white border w-full md:w-4/12 border-slate-100 shadow-sm rounded-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs uppercase tracking-[0.2em] font-black text-[#1a365d]">Group Fellowship Rankings</h3>
          </div>
          <div className="p-2">
            <GroupLeaderboard />
          </div>
        </div>
      {/* Sidebar Space for Scripture - Mimicking Slide 5 */}
        <div className="bg-[#f8fafc] w-full md:w-4/12 p-8 border border-slate-200 rounded-sm">
           <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-6">Scripture Focus</h4>
           <blockquote className="space-y-4">
             <p className="text-slate-700 font-serif italic text-lg leading-relaxed">
               "Your word is a lamp for my feet, a light on my path."
             </p>
             <footer className="text-xs font-bold uppercase tracking-widest text-[#1a365d]">
               — Psalm 119:105
             </footer>
           </blockquote>
        </div>
      </div>
    </div>
  );
}

// Consistent Stat Card Component
function StatCardComponent({ label, value, icon: Icon, color }) {
  const colorMap = { blue: 'border-blue-500', emerald: 'border-emerald-500', indigo: 'border-indigo-500', amber: 'border-amber-500' };
  return (
    <div className={`bg-white p-6 border border-slate-100 border-l-4 ${colorMap[color]} shadow-sm`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">{label}</span>
        <Icon className="w-4 h-4 text-slate-300" />
      </div>
      <div className="text-3xl font-extrabold text-slate-800">{value}</div>
    </div>
  );
}