import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  UserPlus,
  Search,
  TrendingUp,
  CheckSquare,
  X,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FolderPlus,
  MessageSquare,
  LogOut,
  Menu,
  Calendar,
  Crown,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Button, Badge, Modal } from '../components/ui';
import { supabase } from '../lib/supabase';
import {
  getGroupMembers,
  addCoLeader,
  removeMember,
  getAvailableLeaders,
} from '../services/groups.service';

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, logout } = useAuth();

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Group Data
  const [group, setGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Co-Leader Modal
  const [showAddLeaderModal, setShowAddLeaderModal] = useState(false);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [addingLeader, setAddingLeader] = useState(false);
  const [modalError, setModalError] = useState('');

  // Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [memberSearchInput, setMemberSearchInput] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberModalError, setMemberModalError] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSubmissions: 0,
    todaySubmissionPercent: 0,
  });

  // Calendar View
  const [viewMode, setViewMode] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [memberSearch, setMemberSearch] = useState('');
  const [devotionData, setDevotionData] = useState({});

  // Check if current user is a leader of this group
  const isLeader = groupMembers.some((m) => m.member_role === 'leader' && m.id === user?.id);
  const isAdmin = profile?.role === 'admin';
  const canManageLeaders = isLeader || isAdmin;

  // Helper to format dates using local time (not UTC) to avoid timezone shifts
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch group data
  const fetchGroupData = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError('');

    try {
      console.log('Fetching data for group:', groupId);

      // 1. Fetch group info
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError || !groupData) {
        throw new Error('Group not found');
      }
      setGroup(groupData);
      console.log('Group Data:', groupData);

      // 2. Fetch members (includes leaders and members)
      const members = await getGroupMembers(groupId);
      console.log('Fetched Members:', members); // DEBUG LOG
      setGroupMembers(members);

      if (members.length === 0) {
        console.warn('No members found for this group in database');
      }

      // 3. Fetch devotions for these members
      await fetchDevotionsForPeriod(groupId, members);

      // 4. Calculate stats
      calculateStats(groupId, members);
    } catch (err) {
      console.error('Failed to fetch group data:', err);
      setError(err.message || 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Fetch devotions for a date range
  async function fetchDevotionsForPeriod(groupId, members) {
    const { startDate, endDate } = getDateRange();

    // We need to map members by ID first
    const memberIds = members.map((m) => m.id);

    if (memberIds.length === 0) {
      setDevotionData({});
      return;
    }

    console.log('Fetching devotions for', memberIds.length, 'members');

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    console.log('Date range:', startDateStr, 'to', endDateStr);

    // Fetch devotions for the group members in this date range (no group_id column needed)
    const { data, error: devError } = await supabase
      .from('devotions')
      .select('user_id, devotion_date')
      .in('user_id', memberIds)
      .gte('devotion_date', startDateStr)
      .lte('devotion_date', endDateStr);

    if (devError) {
      console.error('Failed to fetch devotions:', devError);
      return;
    }

    console.log('Fetched Devotions:', data);

    const dataMap = {};
    members.forEach((m) => {
      dataMap[m.id] = {};
    });

    (data || []).forEach((d) => {
      if (!dataMap[d.user_id]) dataMap[d.user_id] = {};
      // devotion_date is already a DATE type string like "2024-04-05" from the DB
      // Store it directly as the key
      const dateStr = typeof d.devotion_date === 'string' 
        ? d.devotion_date.substring(0, 10) 
        : new Date(d.devotion_date).toLocaleDateString('sv-SE'); // sv-SE gives YYYY-MM-DD format
      if (dateStr) {
        dataMap[d.user_id][dateStr] = true;
      }
    });

    console.log('Devotion Data Map:', dataMap);
    setDevotionData(dataMap);
  }

  // Get date range based on view mode
  function getDateRange() {
    const now = selectedDate;
    let startDate, endDate;

    if (viewMode === 'weekly') {
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - daysSinceMonday);
      startDate = startOfWeek;
      endDate = new Date(startOfWeek);
      endDate.setDate(startOfWeek.getDate() + 6);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  }

  // Get days for calendar grid
  function getCalendarDays() {
    const { startDate, endDate } = getDateRange();
    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  // Filtered members
  const filteredMembers = groupMembers.filter(
    (m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Calculate stats
  async function calculateStats(groupId, members) {
    const { startDate, endDate } = getDateRange();

    // Get member IDs for this group
    const memberIds = members.map(m => m.id);

    let periodCount = 0;
    let todayCount = 0;

    if (memberIds.length > 0) {
      // Use local time for "today" to match Philippines timezone
      const today = formatDate(new Date());
      
      // Count for selected period
      const { count: periodCountResult } = await supabase
        .from('devotions')
        .select('*', { count: 'exact', head: true })
        .in('user_id', memberIds)
        .gte('devotion_date', formatDate(startDate))
        .lte('devotion_date', formatDate(endDate));

      // Count for today
      const { count: todayCountResult } = await supabase
        .from('devotions')
        .select('*', { count: 'exact', head: true })
        .in('user_id', memberIds)
        .eq('devotion_date', today);

      periodCount = periodCountResult || 0;
      todayCount = todayCountResult || 0;
    }

    setStats({
      totalMembers: members.length,
      totalSubmissions: periodCount,
      todaySubmissionPercent:
        members.length > 0 ? Math.round((todayCount / members.length) * 100) : 0,
    });
  }

  // Add Co-Leader Modal Logic
  async function loadAvailableLeaders() {
    const leaders = await getAvailableLeaders(groupId);
    setAvailableLeaders(leaders);
  }

  function handleOpenAddLeaderModal() {
    setShowAddLeaderModal(true);
    setLeaderSearch('');
    setModalError('');
    loadAvailableLeaders();
  }

  const filteredLeaders = availableLeaders.filter(
    (l) =>
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(leaderSearch.toLowerCase()) ||
      l.email?.toLowerCase().includes(leaderSearch.toLowerCase())
  );

  async function handleAddLeader(leaderId) {
    setAddingLeader(true);
    setModalError('');

    try {
      await addCoLeader(groupId, leaderId);
      // Refresh members list
      const members = await getGroupMembers(groupId);
      setGroupMembers(members);
      setShowAddLeaderModal(false);
      setLeaderSearch('');
    } catch (err) {
      setModalError(err.message || 'Failed to add co-leader');
    } finally {
      setAddingLeader(false);
    }
  }

  async function handleRemoveMember(memberId, memberName) {
    if (!confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;

    try {
      await removeMember(groupId, memberId);
      // Refresh members list
      const members = await getGroupMembers(groupId);
      setGroupMembers(members);
    } catch (err) {
      setError(err.message);
    }
  }

  // Add Member Modal Logic
  async function loadAvailableMembers() {
    // Fetch all users who are not already in this group
    const { data: existingMembers } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    const existingUserIds = new Set((existingMembers || []).map(m => m.user_id));

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .order('first_name');

    if (error) {
      console.error('Failed to fetch users:', error.message);
      return;
    }

    // Filter out existing members and current user
    const available = (users || [])
      .filter(u => !existingUserIds.has(u.id) && u.id !== user?.id)
      .map(u => ({
        ...u,
        alreadyAssigned: false,
      }));

    setAvailableMembers(available);
  }

  function handleOpenAddMemberModal() {
    setShowAddMemberModal(true);
    setMemberSearchInput('');
    setMemberModalError('');
    loadAvailableMembers();
  }

  const filteredAvailableMembers = availableMembers.filter(
    (u) =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(memberSearchInput.toLowerCase()) ||
      u.email?.toLowerCase().includes(memberSearchInput.toLowerCase())
  );

  async function handleAddMember(userId) {
    setAddingMember(true);
    setMemberModalError('');

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId, role: 'member' });

      if (error) throw error;

      // Refresh members list
      const members = await getGroupMembers(groupId);
      setGroupMembers(members);
      setShowAddMemberModal(false);
      setMemberSearchInput('');
    } catch (err) {
      setMemberModalError(err.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  }

  // Navigation for calendar
  function navigatePeriod(direction) {
    const newDate = new Date(selectedDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setSelectedDate(newDate);
  }

  // Handle logout
  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err.message);
      navigate('/login');
    }
  }

  // Fetch data on mount and when view changes
  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  useEffect(() => {
    if (groupId && groupMembers.length > 0) {
      fetchDevotionsForPeriod(groupId, groupMembers);
      calculateStats(groupId, groupMembers);
    }
  }, [viewMode, selectedDate, groupId]);

  const calendarDays = getCalendarDays();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading group details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-900 font-medium mb-2">Error loading group</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={() => navigate('/leader/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
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
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  profile?.role === 'leader' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                  {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
                </span>
              </div>
            </div>
            {group?.name && (
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <Users className="w-3 h-3" />
                {group.name}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <Link
              to="/leader/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname === '/leader/dashboard'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>
            <Link
              to="/leader/group"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname.startsWith('/leader/group') && !location.pathname.includes(':')
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FolderPlus className="w-5 h-5" />
              Manage Group
            </Link>
            <Link
              to="/leader/messages"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname === '/leader/messages'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              Messages
            </Link>
            <Link
              to="/leader/bible"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname === '/leader/bible'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Bible
            </Link>
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
                {group?.name || 'Group Details'}
              </h2>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 space-y-6">
          {/* Back Button & Header */}
          <div className="flex flex-row gap-2 ">
            <div className="flex items-center gap-4 mr-auto">
              <button
                onClick={() => navigate('/leader/group')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{group?.name}</h1>
                {group?.description && (
                  <p className="text-gray-500 mt-1">{group.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleOpenAddMemberModal}>
                <Users className="w-4 h-4 mr-2" />
                Add Member
              </Button>
              {canManageLeaders && (
                <Button variant="secondary" onClick={handleOpenAddLeaderModal}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Leader
                </Button>
              )}
            </div>
            <Button variant="secondary" onClick={fetchGroupData}>
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{viewMode === 'weekly' ? 'This Week Submissions' : 'This Month Submissions'}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSubmissions}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Today Submission Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todaySubmissionPercent}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Calendar Tracker */}
          <Card>
            <CardHeader
              title="Devotion Tracker"
              subtitle={`${viewMode === 'weekly' ? 'Week of' : ''} ${selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
            />

            {/* View Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'weekly'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'monthly'
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Monthly
                </button>
              </div>

              {/* Period Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigatePeriod(-1)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                  {viewMode === 'weekly'
                    ? `Week of ${calendarDays[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => navigatePeriod(1)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-green-100 border-2 bg-green-500 rounded" />
                <span>Submitted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-white border border-gray-300 bg-red-600 rounded" />
                <span>Not submitted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <span>Future date</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white border-b border-gray-200 p-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[150px]">
                      Member
                    </th>
                    {calendarDays.map((day, i) => {
                      const isToday =
                        day.toDateString() === new Date().toDateString();
                      return (
                        <th
                          key={i}
                          className={`border-b border-gray-200 p-2 text-center text-xs font-medium min-w-[36px] ${
                            isToday ? 'text-primary-600 bg-primary-50' : 'text-gray-500'
                          }`}
                        >
                          <div>{day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</div>
                          <div className={`mt-0.5 ${isToday ? 'bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                            {day.getDate()}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={calendarDays.length + 1}
                        className="text-center py-8 text-gray-500"
                      >
                        No members found
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member, rowIndex) => {
                      const memberDevotions = devotionData[member.id] || {};

                      return (
                        <tr
                          key={member.id}
                          className={rowIndex % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}
                        >
                          <td className="sticky left-0 z-10 border-b border-gray-200 p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-700 flex-shrink-0">
                                {(member.first_name || '?')[0]}{(member.last_name || '?')[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {member.first_name} {member.last_name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          {calendarDays.map((day, dayIndex) => {
                            // Use local date string to match database (Philippines time)
                            const year = day.getFullYear();
                            const month = String(day.getMonth() + 1).padStart(2, '0');
                            const date = String(day.getDate()).padStart(2, '0');
                            const dateStr = `${year}-${month}-${date}`;
                            const isSubmitted = memberDevotions[dateStr];
                            const isFuture = day > new Date();
                            const isToday = day.toDateString() === new Date().toDateString();

                            return (
                              <td
                                key={dayIndex}
                                className={`border-b border-gray-100 p-1 text-center ${
                                  isToday ? 'bg-primary-50/30' : ''
                                }`}
                              >
                                {isFuture ? (
                                  <div className="w-5 h-5 mx-auto bg-gray-200 rounded" />
                                ) : isSubmitted ? (
                                  <div className="w-5 h-5 mx-auto bg-green-100 border-2 border-green-500 rounded flex items-center justify-center">
                                    <CheckSquare className="w-3 h-3 text-green-700" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 mx-auto bg-white border border-gray-300 rounded" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Add Co-Leader Modal */}
          <Modal
            isOpen={showAddLeaderModal}
            onClose={() => setShowAddLeaderModal(false)}
            title="Add Leader"
          >
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="input-field pl-9"
                  value={leaderSearch}
                  onChange={(e) => setLeaderSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Modal Error */}
              {modalError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">{modalError}</p>
                </div>
              )}

              {/* Available Leaders List */}
              <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2">
                {filteredLeaders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {leaderSearch ? 'No leaders found' : 'No leaders available'}
                  </p>
                ) : (
                  filteredLeaders.map((leader) => (
                    <div
                      key={leader.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-700">
                          {(leader.first_name || '?')[0]}{(leader.last_name || '?')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {leader.first_name} {leader.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{leader.email}</p>
                        </div>
                      </div>
                      {leader.alreadyAssigned ? (
                        <Badge color="gray">Already assigned</Badge>
                      ) : (
                        <Button
                          variant="primary"
                          className="text-xs py-1.5 px-3"
                          loading={addingLeader}
                          onClick={() => handleAddLeader(leader.id)}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Modal>

          {/* Add Member Modal */}
          <Modal
            isOpen={showAddMemberModal}
            onClose={() => setShowAddMemberModal(false)}
            title="Add Member"
          >
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="input-field pl-9"
                  value={memberSearchInput}
                  onChange={(e) => setMemberSearchInput(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Modal Error */}
              {memberModalError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700">{memberModalError}</p>
                </div>
              )}

              {/* Available Members List */}
              <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2">
                {filteredAvailableMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {memberSearchInput ? 'No users found' : 'No users available'}
                  </p>
                ) : (
                  filteredAvailableMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-semibold text-green-700">
                          {(member.first_name || '?')[0]}{(member.last_name || '?')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        className="text-xs py-1.5 px-3"
                        loading={addingMember}
                        onClick={() => handleAddMember(member.id)}
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
}
