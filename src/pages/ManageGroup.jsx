import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, CheckCircle, AlertCircle, X, UserPlus, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Button, Badge, Modal } from '../components/ui';
import {
  createGroup,
  getAvailableLeaders,
  addCoLeader,
  removeCoLeader,
  getGroupLeaders,
  getLeaderGroups,
} from '../services/groups.service';

export default function ManageGroup() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  // Create Group Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Feedback State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Multi-group state
  const [leaderGroups, setLeaderGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Co-leader management for selected group
  const [showAddLeader, setShowAddLeader] = useState(false);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [currentLeaders, setCurrentLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  const isLeader = profile?.role === 'leader';

  // Fetch all groups this leader manages
  useEffect(() => {
    async function loadLeaderGroups() {
      if (!user?.id) return;
      const groups = await getLeaderGroups(user.id);
      setLeaderGroups(groups);
      // Auto-select the first group or keep current selection
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id);
      }
    }
    loadLeaderGroups();
  }, [user?.id]);

  // Fetch leaders for selected group
  useEffect(() => {
    if (!selectedGroupId) return;
    loadLeaders(selectedGroupId);
  }, [selectedGroupId]);

  const selectedGroup = leaderGroups.find((g) => g.id === selectedGroupId);

  // Fetch current group leaders
  async function loadLeaders(groupId) {
    if (!groupId) return;
    try {
      const leaders = await getGroupLeaders(groupId);
      setCurrentLeaders(leaders);
    } catch (err) {
      console.error('Failed to load leaders:', err);
    }
  }

  // Fetch available leaders for co-leader assignment
  async function loadAvailableLeaders() {
    setLoadingLeaders(true);
    try {
      const leaders = await getAvailableLeaders(selectedGroupId);
      setAvailableLeaders(leaders);
    } catch (err) {
      console.error('Failed to fetch leaders:', err);
    } finally {
      setLoadingLeaders(false);
    }
  }

  // Open add leader modal
  function handleOpenAddLeader() {
    setShowAddLeader(true);
    loadAvailableLeaders();
  }

  // Add a co-leader
  async function handleAddLeader(leaderId) {
    if (!selectedGroupId) return;

    try {
      await addCoLeader(selectedGroupId, leaderId);
      loadLeaders(selectedGroupId);
      loadAvailableLeaders();
    } catch (err) {
      setError(err.message);
    }
  }

  // Remove a co-leader
  async function handleRemoveLeader(leaderId) {
    if (!selectedGroupId) return;
    if (!confirm('Remove this co-leader from the group?')) return;

    try {
      await removeCoLeader(selectedGroupId, leaderId);
      loadLeaders(selectedGroupId);
      loadAvailableLeaders();
    } catch (err) {
      setError(err.message);
    }
  }

  // Create a new group
  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!groupName.trim()) return;

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔹 Step 1: Creating group with name:', groupName.trim());

      // 1. Create the group (trigger auto-assigns leader)
      const group = await createGroup(groupName.trim(), description.trim());
      console.log('✅ Group created:', group);

      // 2. Refresh leader groups list
      const groups = await getLeaderGroups(user.id);
      setLeaderGroups(groups);
      setSelectedGroupId(group.id);

      setSuccess(`Group "${group.name}" created successfully! You are now the group leader.`);
      setGroupName('');
      setDescription('');
      setShowCreateModal(false); // Close modal

      // Load leaders for this group
      loadLeaders(group.id);

      console.log('✅ All steps completed successfully!');
    } catch (err) {
      console.error('❌ Group creation error:', err);
      setError(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  // Reset form when modal closes
  function handleCloseCreateModal() {
    setShowCreateModal(false);
    setGroupName('');
    setDescription('');
    setError('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
          <p className="text-gray-500 mt-1">Create and manage your groups</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Group
        </Button>
      </div>

      {/* Success/Error */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        title="Create New Group"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label htmlFor="groupName" className="label">Group Name *</label>
            <input
              id="groupName"
              type="text"
              className="input-field"
              placeholder="e.g., Morning Devotion Group"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Must be unique — no two groups can have the same name</p>
          </div>

          <div>
            <label htmlFor="description" className="label">Description (Optional)</label>
            <textarea
              id="description"
              rows={3}
              className="input-field"
              placeholder="Describe your group's purpose..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{description.length}/500</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleCloseCreateModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={creating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* My Groups List */}
      {leaderGroups.length > 0 && (
        <Card>
          <CardHeader
            title="My Groups"
            subtitle={`${leaderGroups.length} group${leaderGroups.length !== 1 ? 's' : ''} managed`}
          />

          <div className="space-y-2">
            {leaderGroups.map((group) => {
              const isSelected = group.id === selectedGroupId;
              return (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isSelected
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-gray-500">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={isSelected ? 'primary' : 'secondary'}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/leader/group/${group.id}`);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Selected Group Details */}
      {selectedGroup && (
        <Card>
          <CardHeader
            title={selectedGroup.name}
            subtitle="Manage co-leaders and group settings"
            action={
              <Button variant="secondary" onClick={handleOpenAddLeader}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Co-Leader
              </Button>
            }
          />

          {/* Group Info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-700">
                You are managing this group
              </p>
            </div>
            {selectedGroup.description && (
              <p className="text-sm text-gray-600 mb-4">{selectedGroup.description}</p>
            )}
          </div>

          {/* Co-Leaders */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Group Leaders ({currentLeaders.length + 1})
            </h4>

            {/* Primary leader (current user) */}
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg border border-primary-200">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-sm font-semibold text-white">
                {(profile?.first_name || '?')[0]}{(profile?.last_name || '?')[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
              <Badge color="blue">Primary Leader</Badge>
            </div>

            {/* Co-leaders */}
            {currentLeaders.map((leader) => (
              <div
                key={leader.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mt-2"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                  {(leader.first_name || '?')[0]}{(leader.last_name || '?')[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {leader.first_name} {leader.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{leader.email}</p>
                </div>
                <Badge color="blue">Co-Leader</Badge>
                <button
                  onClick={() => handleRemoveLeader(leader.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove co-leader"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {currentLeaders.length === 0 && (
              <p className="text-sm text-gray-400 mt-2 text-center py-4">
                No co-leaders assigned yet. Add one to share management.
              </p>
            )}
          </div>
        </Card>
      )}

      
    </div>
  );
}
