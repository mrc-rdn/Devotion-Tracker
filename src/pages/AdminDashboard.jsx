import { useState, useEffect } from 'react';
import { Users, Shield, Database, Activity, UserPlus, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, StatCard, Badge, Skeleton, EmptyState, Modal, Button } from '../components/ui';
import { supabase } from '../lib/supabase';
import { getGroups } from '../services/auth.service';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalDevotions: 0,
    activeToday: 0,
  });
  const [users, setUsers] = useState([]);
  const [groups, setGroupsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch dashboard data
  async function fetchData() {
    setLoading(true);

    try {
      // Count users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Count groups
      const { count: groupCount } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true });

      // Count devotions
      const { count: devotionCount } = await supabase
        .from('devotions')
        .select('*', { count: 'exact', head: true });

      // Active today
      const today = new Date().toISOString().split('T')[0];
      const { count: activeCount } = await supabase
        .from('devotions')
        .select('*', { count: 'exact', head: true })
        .eq('devotion_date', today);

      setStats({
        totalUsers: userCount || 0,
        totalGroups: groupCount || 0,
        totalDevotions: devotionCount || 0,
        activeToday: activeCount || 0,
      });

      // Fetch users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch group memberships for each user
      const usersWithGroups = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: memberships } = await supabase
            .from('group_members')
            .select(`
              group_id,
              role,
              groups (id, name)
            `)
            .eq('user_id', user.id);
          
          return {
            ...user,
            userGroups: memberships || [],
            groupId: memberships?.[0]?.group_id || null,
            groupName: memberships?.[0]?.groups?.name || null,
          };
        })
      );

      setUsers(usersWithGroups || []);

      // Fetch groups
      const groupsData = await getGroups();
      setGroupsList(groupsData);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Create a new group
  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({ name: newGroupName.trim() })
        .select()
        .single();

      if (error) throw error;

      setGroupsList([...groups, data]);
      setNewGroupName('');
      setShowCreateGroup(false);
      setStats((prev) => ({ ...prev, totalGroups: prev.totalGroups + 1 }));
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
    }
  }

  // Update user role
  async function updateUserRole(userId, newRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update role:', error.message);
      return;
    }

    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  }

  // Assign user to group
  async function assignUserToGroup(userId, groupId) {
    const { error } = await supabase
      .from('profiles')
      .update({ group_id: groupId || null })
      .eq('id', userId);

    if (error) {
      console.error('Failed to assign group:', error.message);
      return;
    }

    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, group_id: groupId, groups: groups.find((g) => g.id === groupId) } : u
      )
    );
  }

  function getRoleColor(role) {
    switch (role) {
      case 'admin':
        return 'purple';
      case 'leader':
        return 'blue';
      default:
        return 'green';
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel 🔒</h1>
          <p className="text-gray-500 mt-1">Manage users, groups, and system settings</p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
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
              label="Total Users"
              value={stats.totalUsers}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Total Groups"
              value={stats.totalGroups}
              icon={Shield}
              color="purple"
            />
            <StatCard
              label="Total Devotions"
              value={stats.totalDevotions}
              icon={Database}
              color="green"
            />
            <StatCard
              label="Active Today"
              value={stats.activeToday}
              icon={Activity}
              color="yellow"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowCreateGroup(true)}
            variant="primary"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
          <Button variant="secondary" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </Card>

      {/* Groups */}
      <Card>
        <CardHeader
          title="Groups"
          subtitle={`${groups.length} groups in the system`}
        />
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="font-medium text-gray-900">{group.name}</p>
                {group.description && (
                  <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Shield}
            title="No groups yet"
            description="Create your first group to get started."
          />
        )}
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader
          title="Users"
          subtitle="Manage user roles and group assignments"
        />
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Group
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-semibold text-primary-700">
                          {user.first_name?.[0] || '?'}
                          {user.last_name?.[0] || '?'}
                        </div>
                        <span className="text-sm font-medium">
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">{user.email}</td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="text-xs font-medium rounded-full px-2 py-1 border-0 bg-transparent text-center cursor-pointer"
                      >
                        <option value="member">Member</option>
                        <option value="leader">Leader</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={user.group_id || ''}
                        onChange={(e) => assignUserToGroup(user.id, e.target.value || null)}
                        className="input-field text-xs py-1.5"
                      >
                        <option value="">No group</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge color={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="No users found"
            description="Users will appear here after they sign up."
          />
        )}
      </Card>

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        title="Create New Group"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label htmlFor="groupName" className="label">Group Name</label>
            <input
              id="groupName"
              type="text"
              className="input-field"
              placeholder="Enter group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCreateGroup(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={creating}
            >
              Create Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
