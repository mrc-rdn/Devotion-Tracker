import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, CheckCircle, AlertCircle, X, UserPlus, Eye, Crown, Search, LogOut, RefreshCw, Search as SearchIcon, ShieldAlert, UserMinus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, Button, Badge, Modal } from '../components/ui';
import {
  createGroup,
  getAvailableLeaders,
  addCoLeader,
  removeMember,
  getGroupLeaders,
  getLeaderGroups,
  promoteToCoLeader,
  demoteFromLeader,
  getUserRoleInGroup,
  leaveGroup,
  deleteGroup,
  getUserGroupMemberships,
  searchGroups,
  joinGroup,
} from '../services/groups.service';

export default function ManageGroup() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  // Create Group Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Search & Join State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Feedback State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Multi-group state
  const [leaderGroups, setLeaderGroups] = useState([]);
  const [userMemberships, setUserMemberships] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [userRoleInGroup, setUserRoleInGroup] = useState('none');

  // Co-leader management for selected group
  const [showAddLeader, setShowAddLeader] = useState(false);
  const [availableLeaders, setAvailableLeaders] = useState([]);
  const [currentLeaders, setCurrentLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  // Member management
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Search state for Add Leader Modal
  const [leaderSearch, setLeaderSearch] = useState('');

  // Fetch all groups this user belongs to
  useEffect(() => {
    async function loadUserGroups() {
      if (!user?.id) return;
      try {
        const leaderGroupsData = await getLeaderGroups(user.id);
        setLeaderGroups(leaderGroupsData);

        const memberships = await getUserGroupMemberships(user.id);
        setUserMemberships(memberships);

        if (memberships.length > 0 && !selectedGroupId) {
          setSelectedGroupId(memberships[0].id);
        }
      } catch (err) {
        console.error('Failed to load user groups:', err);
      }
    }
    loadUserGroups();
  }, [user?.id, selectedGroupId]);

  // Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        try {
          const results = await searchGroups(searchQuery);
          setSearchResults(results);
        } catch (err) {
          console.error(err);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch user role and group details for selected group
  useEffect(() => {
    if (!selectedGroupId || !user?.id) return;

    async function loadRole() {
      const role = await getUserRoleInGroup(selectedGroupId, user.id);
      console.log('🔑 ManageGroup: userRoleInGroup =', role, '| groupId =', selectedGroupId, '| userId =', user.id);
      setUserRoleInGroup(role);
    }
    loadRole();
    loadLeaders(selectedGroupId);
    loadMembers(selectedGroupId);
  }, [selectedGroupId, user?.id]);

  const selectedGroup = userMemberships.find((g) => g.id === selectedGroupId);

  // Permissions based on Role
  // 'owner' = Leader (Creator) - The only "Leader" with full control
  // 'leader' = Co-Leader (Promoted member) - Can manage group & view devotions, but CANNOT promote/demote
  // 'member' = Member
  const isOwner = userRoleInGroup === 'owner';
  const isCoLeader = userRoleInGroup === 'leader';
  const isMember = userRoleInGroup === 'member';

  console.log('🔑 ManageGroup: isOwner =', isOwner, '| isCoLeader =', isCoLeader, '| userRoleInGroup =', userRoleInGroup, '| selectedGroup =', selectedGroup?.name);

  async function loadLeaders(groupId) {
    if (!groupId) return;
    try {
      const leaders = await getGroupLeaders(groupId);
      setCurrentLeaders(leaders);
    } catch (err) {
      console.error('Failed to load leaders:', err);
    }
  }

  async function loadMembers(groupId) {
    if (!groupId) return;
    try {
      const { getGroupMembers } = await import('../services/groups.service');
      const members = await getGroupMembers(groupId);
      setGroupMembers(members);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }

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

  function handleOpenAddLeader() {
    setShowAddLeader(true);
    setLeaderSearch('');
    loadAvailableLeaders();
  }

  async function handleAddLeader(leaderId) {
    if (!selectedGroupId) return;
    try {
      await addCoLeader(selectedGroupId, leaderId);
      loadLeaders(selectedGroupId);
      loadAvailableLeaders();
      setSuccess('Co-Leader added successfully!');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePromoteMember(memberId) {
    if (!selectedGroupId) return;
    try {
      await promoteToCoLeader(selectedGroupId, memberId);
      loadMembers(selectedGroupId);
      loadLeaders(selectedGroupId);
      setShowPromoteModal(false);
      setSuccess('Member promoted to Co-Leader successfully!');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveMember(memberId) {
    if (!selectedGroupId) return;
    if (!confirm('Remove this member from the group?')) return;
    try {
      await removeMember(selectedGroupId, memberId);
      loadMembers(selectedGroupId);
      setSuccess('Member removed successfully!');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveLeader(leaderId) {
    if (!selectedGroupId) return;
    if (leaderId === user.id) {
      setError('You cannot remove yourself from the group.');
      return;
    }
    if (!confirm('Remove this leader from the group?')) return;
    try {
      await removeMember(selectedGroupId, leaderId);
      loadLeaders(selectedGroupId);
      loadAvailableLeaders();
      setSuccess('Leader removed successfully!');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDemoteLeader(leaderId) {
    if (!selectedGroupId) return;
    if (leaderId === user.id) {
      setError('You cannot demote yourself.');
      return;
    }
    if (!confirm('Are you sure you want to demote this leader to a member?')) return;
    try {
      await demoteFromLeader(selectedGroupId, leaderId);
      loadLeaders(selectedGroupId);
      loadMembers(selectedGroupId);
      setSuccess('Leader demoted to member successfully!');
    } catch (err) {
      setError(err.message);
    }
  }

  // UPDATED: Leave Group Logic - Owners Cannot Leave
  async function handleLeaveGroup() {
    if (!selectedGroupId) return;
    
    // 1. Check if user is the owner/creator
    if (isOwner) {
      setError('As the group creator, you cannot leave this group. You must delete it to remove yourself.');
      return;
    }

    // 2. Confirm with user
    if (!confirm('Are you sure you want to leave this group?')) return;
    
    try {
      await leaveGroup(selectedGroupId);
      setSuccess('You have left the group.');
      
      // 3. Refresh lists
      const memberships = await getUserGroupMemberships(user.id);
      setUserMemberships(memberships);
      const leaderGroupsData = await getLeaderGroups(user.id);
      setLeaderGroups(leaderGroupsData);
      
      if (memberships.length > 0) {
        setSelectedGroupId(memberships[0].id);
      } else {
        setSelectedGroupId(null);
        setUserRoleInGroup('none');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // Delete Group - Owner Only
  async function handleDeleteGroup() {
    if (!selectedGroupId) return;
    if (!confirm(`Are you sure you want to delete "${selectedGroup.name}"? This action cannot be undone. All members, co-leaders, and devotion data will be permanently removed.`)) return;
    
    try {
      await deleteGroup(selectedGroupId);
      setSuccess(`Group "${selectedGroup.name}" has been deleted.`);
      
      // Refresh lists
      const memberships = await getUserGroupMemberships(user.id);
      setUserMemberships(memberships);
      const leaderGroupsData = await getLeaderGroups(user.id);
      setLeaderGroups(leaderGroupsData);
      
      if (memberships.length > 0) {
        setSelectedGroupId(memberships[0].id);
      } else {
        setSelectedGroupId(null);
        setUserRoleInGroup('none');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const group = await createGroup(groupName.trim(), description.trim());
      const groups = await getLeaderGroups(user.id);
      setLeaderGroups(groups);
      const memberships = await getUserGroupMemberships(user.id);
      setUserMemberships(memberships);
      setSelectedGroupId(group.id);
      setSuccess(`Group "${group.name}" created successfully!`);
      setGroupName('');
      setDescription('');
      setShowCreateModal(false);
      loadLeaders(group.id);
    } catch (err) {
      console.error('Group creation error:', err);
      setError(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false);
    setGroupName('');
    setDescription('');
    setError('');
  }

  // Join Group Handler
  async function handleJoinGroup(groupId) {
    try {
      await joinGroup(groupId);
      setSuccess('Joined group successfully!');
      setSearchQuery('');
      setSearchResults([]);
      refreshUserGroups();
    } catch (err) {
      setError(err.message);
    }
  }

  // Refresh Function
  async function refreshUserGroups() {
    setRefreshing(true);
    try {
      const memberships = await getUserGroupMemberships(user.id);
      setUserMemberships(memberships);
      const leaderGroupsData = await getLeaderGroups(user.id);
      setLeaderGroups(leaderGroupsData);
      
      if (selectedGroupId) {
        const role = await getUserRoleInGroup(selectedGroupId, user.id);
        setUserRoleInGroup(role);
        loadLeaders(selectedGroupId);
        loadMembers(selectedGroupId);
      }
    } catch (err) {
      setError('Failed to refresh groups');
    } finally {
      setRefreshing(false);
    }
  }

  const filteredAvailableLeaders = availableLeaders.filter(
    (l) =>
      `${l.first_name} ${l.last_name}`.toLowerCase().includes(leaderSearch.toLowerCase()) ||
      l.email?.toLowerCase().includes(leaderSearch.toLowerCase())
  );

  const promotableMembers = groupMembers.filter(m => m.member_role === 'member');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
          <p className="text-gray-500 mt-1">Create, manage, and join groups</p>
        </div>
        <div className="flex gap-3">
           <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Group
            </Button>
        </div>
      </div>

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

      {/* --- SEARCH GROUPS CARD --- */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <SearchIcon className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Find & Join Groups</h3>
        </div>
        
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by group name..."
            className="w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searching && <p className="text-sm text-gray-500">Searching...</p>}

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((group) => {
              const isAlreadyMember = userMemberships.some(m => m.id === group.id);
              return (
                <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">{group.name}</p>
                    <p className="text-xs text-gray-500">{group.description || 'No description'}</p>
                  </div>
                  {isAlreadyMember ? (
                    <Badge color="green">Joined</Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleJoinGroup(group.id)}>
                      Join Group
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal isOpen={showCreateModal} onClose={handleCloseCreateModal} title="Create New Group">
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label htmlFor="groupName" className="label">Group Name *</label>
            <input id="groupName" type="text" className="input-field" placeholder="e.g., Morning Devotion Group" value={groupName} onChange={(e) => setGroupName(e.target.value)} required autoFocus />
            <p className="text-xs text-gray-400 mt-1">Must be unique — no two groups can have the same name</p>
          </div>
          <div>
            <label htmlFor="description" className="label">Description (Optional)</label>
            <textarea id="description" rows={3} className="input-field" placeholder="Describe your group's purpose..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            <p className="text-xs text-gray-400 mt-1">{description.length}/500</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseCreateModal}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" loading={creating}><Plus className="w-4 h-4 mr-2" /> Create Group</Button>
          </div>
        </form>
      </Modal>

      {userMemberships.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">My Groups</h3>
              <p className="text-sm text-gray-500">{userMemberships.length} group{userMemberships.length !== 1 ? 's' : ''}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={refreshUserGroups} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="space-y-2">
            {userMemberships.map((membership) => {
              const isSelected = membership.id === selectedGroupId;
              
              // Label mapping
              let roleLabel = 'Member';
              let roleColor = 'bg-green-100 text-green-700';
              
              if (membership.role === 'owner') {
                roleLabel = 'Leader';
                roleColor = 'bg-purple-100 text-purple-700';
              } else if (membership.role === 'leader') {
                roleLabel = 'Co-Leader';
                roleColor = 'bg-blue-100 text-blue-700';
              }

              return (
                <div key={membership.id} onClick={() => setSelectedGroupId(membership.id)} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {membership.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{membership.name}</p>
                      {membership.description && <p className="text-xs text-gray-500">{membership.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={roleColor}>{roleLabel}</Badge>
                    {/* View Details for Leader and Co-Leader */}
                    {(membership.role === 'owner' || membership.role === 'leader') && (
                      <Button size="sm" variant={isSelected ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); navigate(`/leader/group/${membership.id}`); }}>
                        <Eye className="w-4 h-4 mr-1" /> View Details
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {selectedGroup && (isOwner || isCoLeader) && (
        <Card>
          <CardHeader 
            title={selectedGroup.name} 
            subtitle={`Manage group settings — Your role: ${isOwner ? 'Leader (Owner)' : 'Co-Leader'}`} 
            action={
              <div className="flex flex-wrap gap-2">
                {/* Only Owners can Add Co-Leaders and Promote */}
                {isOwner && (
                  <>
                    <Button variant="secondary" onClick={handleOpenAddLeader}><UserPlus className="w-4 h-4 mr-2" /> Add Co-Leader</Button>
                    {groupMembers.length > 0 && (
                      <Button variant="secondary" onClick={() => setShowPromoteModal(true)} disabled={promotableMembers.length === 0}><Crown className="w-4 h-4 mr-2" /> Promote Member</Button>
                    )}
                  </>
                )}
                
                {/* Leave Group Button - Only for Non-Owners */}
                {!isOwner && (
                  <Button variant="danger" onClick={handleLeaveGroup}><LogOut className="w-4 h-4 mr-2" /> Leave Group</Button>
                )}
              </div>
            } 
          />
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-700">You are {isOwner ? 'the leader' : 'a co-leader'} of this group</p>
            </div>
            {selectedGroup.description && <p className="text-sm text-gray-600 mb-4">{selectedGroup.description}</p>}
            
            {/* Owner Notice */}
            {isOwner && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p><strong>Leader Notice:</strong> As the group creator, you cannot leave this group. To remove yourself, you must delete the group entirely.</p>
                  <Button variant="danger" size="sm" onClick={handleDeleteGroup} className="mt-3">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete This Group
                  </Button>
                </div>
              </div>
            )}
            
            {/* Co-Leader Notice - Updated to reflect management permissions */}
            {isCoLeader && (
               <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                 <Crown className="w-4 h-4 flex-shrink-0 mt-0.5" />
                 <p><strong>Co-Leader:</strong> You have been promoted by the Leader. You can manage the group, add/remove members, and view the devotion tracker. However, only the Leader can promote or demote members.</p>
               </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-500" /> Leaders ({currentLeaders.length})</h4>
            {currentLeaders.length > 0 ? (
              <div className="space-y-2">
                {currentLeaders.map((leader) => {
                  const isCurrentUser = leader.id === user.id;
                  const isLeaderOwner = leader.member_role === 'owner';
                  return (
                    <div key={leader.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isCurrentUser ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-100'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${isCurrentUser ? 'bg-primary-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {(leader.first_name || '?')[0]}{(leader.last_name || '?')[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{leader.first_name} {leader.last_name} {isCurrentUser && '(You)'}</p>
                        <p className="text-xs text-gray-500">{leader.email}</p>
                      </div>
                      <Badge color={isCurrentUser ? 'blue' : 'gray'}>{isCurrentUser ? (isOwner ? 'Leader' : 'Co-Leader') : (isLeaderOwner ? 'Leader' : 'Co-Leader')}</Badge>
                      
                      {/* Only Owner can Demote/Remove */}
                      {isOwner && !isCurrentUser && (
                        <>
                          <button onClick={() => handleDemoteLeader(leader.id)} className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors text-xs font-medium" title="Demote to member">Demote</button>
                          <button onClick={() => handleRemoveLeader(leader.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors" title="Remove leader"><X className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No leaders found</p></div>
            )}
          </div>
        </Card>
      )}

      {/* Members List - Visible to Owner and Co-Leader */}
      {selectedGroup && (isOwner || isCoLeader) && groupMembers.length > 0 && (
        <Card>
           <div className="flex items-center justify-between mb-4">
             <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4 text-gray-500" /> Members ({groupMembers.filter(m => m.member_role === 'member').length})</h4>
           </div>
           <div className="space-y-2">
             {groupMembers.filter(m => m.member_role === 'member').map((member) => (
               <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                      {(member.first_name || '?')[0]}{(member.last_name || '?')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                 </div>
                 {/* Both Owner and Co-Leader can Remove Members */}
                 {(isOwner || isCoLeader) && (
                   <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => handleRemoveMember(member.id)}>
                     <UserMinus className="w-4 h-4" /> Remove
                   </Button>
                 )}
               </div>
             ))}
           </div>
        </Card>
      )}

      {selectedGroup && isMember && (
        <Card>
          <CardHeader title={selectedGroup.name} subtitle={`You are a member of this group`} action={<Button variant="danger" onClick={handleLeaveGroup}><LogOut className="w-4 h-4 mr-2" /> Leave Group</Button>} />
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-blue-600" /><p className="text-sm font-medium text-blue-700">You are a member of this group</p></div>
            {selectedGroup.description && <p className="text-sm text-gray-600 mb-4">{selectedGroup.description}</p>}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-500" /> Group Leaders ({currentLeaders.length})</h4>
            {currentLeaders.length > 0 ? (
              <div className="space-y-2">
                {currentLeaders.map((leader) => (
                  <div key={leader.id} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 border-gray-100">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-blue-100 text-blue-700">{(leader.first_name || '?')[0]}{(leader.last_name || '?')[0]}</div>
                    <div className="flex-1"><p className="text-sm font-medium text-gray-900">{leader.first_name} {leader.last_name}</p><p className="text-xs text-gray-500">{leader.email}</p></div>
                    <Badge color="gray">
                      {leader.member_role === 'owner' ? 'Leader' : 'Co-Leader'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No leaders found</p>
            )}
          </div>
        </Card>
      )}

      <Modal isOpen={showAddLeader} onClose={() => setShowAddLeader(false)} title="Add Co-Leader">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Only the group Leader (Owner) can add Co-Leaders.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search leaders by name or email..." className="input-field pl-9" value={leaderSearch} onChange={(e) => setLeaderSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {loadingLeaders ? (
              <p className="text-center text-sm text-gray-500 py-4">Loading leaders...</p>
            ) : filteredAvailableLeaders.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">{leaderSearch ? 'No leaders match your search' : 'No leaders available to add.'}</p>
            ) : (
              filteredAvailableLeaders.map((leader) => (
                <div key={leader.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-700">{(leader.first_name || '?')[0]}{(leader.last_name || '?')[0]}</div>
                    <div><p className="text-sm font-medium text-gray-900">{leader.first_name} {leader.last_name}</p><p className="text-xs text-gray-500">{leader.email}</p></div>
                  </div>
                  {leader.alreadyAssigned ? (<Badge color="gray">Added</Badge>) : (<Button size="sm" variant="primary" onClick={() => handleAddLeader(leader.id)}>Add</Button>)}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={showPromoteModal} onClose={() => { setShowPromoteModal(false); setSelectedMember(null); }} title="Promote Member to Co-Leader">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select a member to promote to Co-Leader. They will gain view access to the group's devotion tracker but cannot promote others.</p>
          {promotableMembers.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">No members available to promote</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {promotableMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-semibold text-green-700">{(member.first_name || '?')[0]}{(member.last_name || '?')[0]}</div>
                    <div><p className="text-sm font-medium text-gray-900">{member.first_name} {member.last_name}</p><p className="text-xs text-gray-500">{member.email}</p></div>
                  </div>
                  <Button size="sm" variant="primary" onClick={() => handlePromoteMember(member.id)}><Crown className="w-3 h-3 mr-1" /> Promote</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}