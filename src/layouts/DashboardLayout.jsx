import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, MessageSquare, LogOut, Menu, X, Users, Shield,
  Calendar, ChevronRight, UserPlus, FolderPlus, BookOpen, FileText,
} from 'lucide-react';
import { ROLE_LABELS } from '../lib/constants';

export default function DashboardLayout() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = getNavItems(profile?.role);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      navigate('/login', { replace: true });
    }
  }

  // Refined badge colors to match the slide's professional palette
  function getRoleBadgeStyle(role) {
    switch (role) {
      case 'admin': return 'border-purple-400 text-purple-200 bg-purple-900/30';
      case 'leader': return 'border-blue-400 text-blue-200 bg-blue-900/30';
      default: return 'border-emerald-400 text-emerald-200 bg-emerald-900/30';
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Using the Navy slide theme */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-[#1a365d] text-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Logo Section */}
          <div className="p-8 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded">
                <Calendar className="w-5 h-5 text-blue-300" />
              </div>
              <span className="font-bold uppercase tracking-[0.2em] text-sm leading-tight">
                Devotion <br /><span className="text-blue-300/80">Tracker</span>
              </span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-white/10 rounded">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* User Profile - Liturgical Style */}
          <div className="px-8 py-6 bg-black/10">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-white text-[#1a365d] rounded-full flex items-center justify-center font-black text-lg shadow-inner">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-widest font-bold text-white truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <span className={`inline-block mt-1 px-2 py-0.5 border text-xs uppercase font-black tracking-tighter rounded-sm ${getRoleBadgeStyle(profile?.role)}`}>
                  {ROLE_LABELS[profile?.role] || 'User'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation - High Contrast & Clean Icons */}
          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-sm text-[11px] uppercase tracking-[0.15em] font-bold transition-all duration-200 group ${
                    isActive
                      ? 'bg-white text-[#1a365d] shadow-lg'
                      : 'text-blue-100/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-[#1a365d]' : 'text-blue-300/50 group-hover:text-blue-300'}`} />
                  {item.label}
                  {isActive && <div className="ml-auto w-1 h-4 bg-[#1a365d] rounded-full" />}
                </Link>
              );
            })}
          </nav>

          {/* Sign Out Section */}
          <div className="p-6 border-t border-white/10 bg-black/5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 px-4 py-3 rounded-sm text-[11px] uppercase tracking-widest font-black text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all w-full"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-72 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
             <div className="hidden lg:block">
               <h2 className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">
                 Current Section
               </h2>
               <p className="text-sm font-bold text-slate-800">
                 {navItems.find((item) => location.pathname === item.href)?.label || 'Dashboard Overview'}
               </p>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1a365d] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-inner">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Connection</span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="p-6 md:p-10 flex-1">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function getNavItems(role) {
  const baseItems = [
    { href: `/${role}/dashboard`, icon: LayoutDashboard, label: 'Overview' },
    { href: `/${role}/devotion`, icon: FileText, label: 'My Devotion' },
  ];

  if (role === 'member') {
    baseItems.push({ href: '/member/group', icon: Users, label: 'My Groups' });
  } else if (role === 'leader') {
    baseItems.push({ href: '/leader/group', icon: FolderPlus, label: 'My Group' });
  }

  baseItems.push({ href: `/${role}/messages`, icon: MessageSquare, label: 'Messages' });
  baseItems.push({ href: `/${role}/bible`, icon: BookOpen, label: 'The Bible' });

  if (role === 'admin') {
    baseItems.push({ href: '/admin/dashboard', icon: Shield, label: 'Admin Panel' });
  }

  return baseItems;
}