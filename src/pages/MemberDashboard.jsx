import { useState } from 'react';
import { Calendar, TrendingUp, Award, Users, ChevronRight } from 'lucide-react';
import { useDevotions } from '../hooks/useDevotions';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, StatCard, Skeleton } from '../components/ui';
import { TIME_FILTERS, TIME_FILTER_LABELS } from '../lib/constants';
import GroupLeaderboard from './GroupLeaderboard';

export default function MemberDashboard() {
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
    <div className="max-w-7xl mx-auto space-y-10 pb-12">
      {/* Welcome Header - Inspired by Slide 1/Conclusion */}
      <div className="relative overflow-hidden bg-[#1a365d] rounded-sm p-8 md:p-12 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4 opacity-80">
            <div className="w-8 h-[1px] bg-white"></div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Member Portal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight">
            Welcome back, <span className="text-blue-300">{profile?.first_name}</span>
          </h1>
          <p className="text-blue-100/70 mt-3 font-light tracking-wide max-w-md">
            "Let us not grow weary in doing good..." Track your daily devotion journey and remain steadfast.
          </p>
        </div>
        
        {/* Decorative Background Elements from Slides */}
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <div className="flex gap-1">
             <ChevronRight className="w-16 h-16 rotate-90" />
             <ChevronRight className="w-16 h-16 rotate-90 -ml-10" />
          </div>
        </div>
      </div>

      {/* Filter & Stats Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <h2 className="text-xs uppercase tracking-[0.2em] font-black text-slate-400">Activity Overview</h2>
          
          {/* Time Filter - Styled as Slide Navigation */}
          <div className="flex bg-gray-100 p-1 rounded-sm">
            {Object.values(TIME_FILTERS).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all ${
                  timeFilter === filter
                    ? 'bg-[#1a365d] text-white shadow-md'
                    : 'text-slate-500 hover:text-[#1a365d]'
                }`}
              >
                {TIME_FILTER_LABELS[filter]}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid - Minimalist Liturgical Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white animate-pulse border-b-4 border-gray-200" />
            ))
          ) : (
            <>
              <StatCardComponent 
                label="Weekly Focus" 
                value={getStatValue('weekly')} 
                icon={Calendar} 
                borderClass="border-blue-500" 
              />
              <StatCardComponent 
                label="Monthly Growth" 
                value={getStatValue('monthly')} 
                icon={TrendingUp} 
                borderClass="border-emerald-500" 
              />
              <StatCardComponent 
                label="Yearly Faith" 
                value={getStatValue('yearly')} 
                icon={Award} 
                borderClass="border-indigo-500" 
              />
              <StatCardComponent 
                label="Current Streak" 
                value={`${calculateStreak()} Days`} 
                icon={Users} 
                borderClass="border-amber-500" 
              />
            </>
          )}
        </div>
      </div>

      {/* Leaderboard - Card Design from Slide 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {profile?.groupId ? (
            <div className="bg-white border border-gray-100 shadow-sm rounded-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-xs uppercase tracking-[0.2em] font-black text-[#1a365d]">Group Fellowship</h3>
              </div>
              <GroupLeaderboard />
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-sm p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 uppercase tracking-tight">No Group Assigned</h3>
              <p className="text-sm text-slate-400 mt-2 mb-6 max-w-xs mx-auto">
                Connect with your local community to see your group rankings and grow together.
              </p>
              <button className="text-[10px] uppercase tracking-widest font-bold text-[#1a365d] flex items-center mx-auto hover:gap-2 transition-all">
                Join a group <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Space for Scripture - Mimicking Slide 5 */}
        <div className="bg-[#f8fafc] p-8 border border-slate-200 rounded-sm">
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

// Sub-component for styled Stats to keep the main return clean
function StatCardComponent({ label, value, icon: Icon, borderClass }) {
  return (
    <div className={`bg-white p-6 border border-gray-100 border-b-4 ${borderClass} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">{label}</span>
        <Icon className="w-4 h-4 text-slate-300" />
      </div>
      <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
        {value}
      </div>
    </div>
  );
}