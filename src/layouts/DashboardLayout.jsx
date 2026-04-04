import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Users,
  Shield,
  Calendar,
  ChevronRight,
  UserPlus,
  Trophy,
  FolderPlus,
} from 'lucide-react';
import { ROLE_LABELS } from '../lib/constants';

export default function DashboardLayout() {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Build navigation based on role
  const navItems = getNavItems(profile?.role);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err.message);
      navigate('/login', { replace: true });
    }
  }

  function getRoleBadgeColor(role) {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700';
      case 'leader':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Close */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">Devotion Tracker</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                {profile?.first_name?.[0]}
                {profile?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(profile?.role)}`}>
                  {ROLE_LABELS[profile?.role] || 'User'}
                </span>
              </div>
            </div>
            {profile?.group_id && profile?.groups?.name && (
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {profile.groups.name}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="lg:hidden">
              <span className="font-semibold text-gray-900">Devotion Tracker</span>
            </div>
            <div className="hidden lg:block">
              <h2 className="text-sm font-medium text-gray-500">
                {navItems.find((item) => location.pathname === item.href)?.label || 'Dashboard'}
              </h2>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Navigation items by role
function getNavItems(role) {
  const baseItems = [
    { href: `/${role}/dashboard`, icon: LayoutDashboard, label: 'Dashboard' },
  ];

  // Role-specific group items
  if (role === 'member') {
    baseItems.push({ href: '/member/group', icon: UserPlus, label: 'Join Group' });
  } else if (role === 'leader') {
    baseItems.push({ href: '/leader/group', icon: FolderPlus, label: 'Manage Group' });
  }

  baseItems.push({ href: `/${role}/messages`, icon: MessageSquare, label: 'Messages' });

  if (role === 'admin') {
    baseItems.push({ href: '/admin/dashboard', icon: Shield, label: 'Admin Panel' });
  }

  return baseItems;
}
