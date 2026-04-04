import { supabase } from '../lib/supabase';
import { formatDateISO } from '../utils/formatDate';

/**
 * Get all groups where the user is a leader (multi-group support)
 */
export async function getLeaderGroups(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('group_leaders')
    .select(`
      group_id,
      created_at,
      groups (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq('leader_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch leader groups:', error.message);
    return [];
  }

  // Transform nested data
  return (data || []).map((entry) => ({
    id: entry.groups.id,
    name: entry.groups.name,
    description: entry.groups.description,
    created_at: entry.groups.created_at,
    leader_since: entry.created_at,
  }));
}

/**
 * Search groups by name with partial matching
 * Returns top 10 closest matches with their leaders, case-insensitive
 */
export async function searchGroups(query) {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('groups')
    .select(`
      id,
      name,
      description,
      created_at,
      group_leaders (
        leader_id,
        profiles:leader_id (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(10);

  if (error) {
    console.error('Failed to search groups:', error.message);
    return [];
  }

  // Transform nested Supabase data into a flat, UI-friendly structure
  return (data || []).map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    created_at: group.created_at,
    leaders: (group.group_leaders || [])
      .filter((gl) => gl.profiles) // Filter out any null profiles
      .map((gl) => ({
        id: gl.profiles.id,
        first_name: gl.profiles.first_name,
        last_name: gl.profiles.last_name,
        email: gl.profiles.email,
      })),
  }));
}

/**
 * Get all groups with their leaders
 */
export async function getAllGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      id,
      name,
      description,
      created_at,
      group_leaders (
        leader_id,
        profiles (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .order('name');

  if (error) {
    console.error('Failed to fetch groups:', error.message);
    return [];
  }

  // Transform nested Supabase data into a flat, UI-friendly structure
  return (data || []).map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    created_at: group.created_at,
    leaders: (group.group_leaders || []).map((gl) => ({
      id: gl.profiles.id,
      first_name: gl.profiles.first_name,
      last_name: gl.profiles.last_name,
      email: gl.profiles.email,
    })),
  }));
}

/**
 * Create a new group (leader or admin)
 * Automatically creates a group_leaders entry for the creator via trigger
 */
export async function createGroup(name, description = '') {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, description })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A group with this name already exists');
    }
    throw new Error(error.message || 'Failed to create group');
  }

  return data;
}

/**
 * Join a group (member)
 */
export async function joinGroup(groupId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({ group_id: groupId })
    .eq('id', user.id)
    .select('*, groups(name)')
    .single();

  if (error) throw new Error(error.message || 'Failed to join group');

  return data;
}

/**
 * Leave current group
 */
export async function leaveGroup() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ group_id: null })
    .eq('id', user.id);

  if (error) throw new Error(error.message || 'Failed to leave group');
}

/**
 * Get group leaders for a group
 */
export async function getGroupLeaders(groupId) {
  const { data, error } = await supabase
    .from('group_leaders')
    .select(`
      leader_id,
      profiles (id, first_name, last_name, email)
    `)
    .eq('group_id', groupId);

  if (error) {
    console.error('Failed to fetch group leaders:', error.message);
    return [];
  }

  return (data || []).map((gl) => ({
    id: gl.profiles.id,
    first_name: gl.profiles.first_name,
    last_name: gl.profiles.last_name,
    email: gl.profiles.email,
  }));
}

/**
 * Add a co-leader to a group
 */
export async function addCoLeader(groupId, leaderId) {
  const { data, error } = await supabase
    .from('group_leaders')
    .insert({ group_id: groupId, leader_id: leaderId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This user is already a leader of this group');
    }
    throw new Error(error.message || 'Failed to add co-leader');
  }

  return data;
}

/**
 * Remove a co-leader from a group
 */
export async function removeCoLeader(groupId, leaderId) {
  const { error } = await supabase
    .from('group_leaders')
    .delete()
    .eq('group_id', groupId)
    .eq('leader_id', leaderId);

  if (error) throw new Error(error.message || 'Failed to remove co-leader');
}

/**
 * Get all leaders (for co-leader assignment)
 */
export async function getAvailableLeaders(currentGroupId = null) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .eq('role', 'leader')
    .order('first_name');

  if (error) {
    console.error('Failed to fetch leaders:', error.message);
    return [];
  }

  // Check which leaders are already assigned to this group
  if (currentGroupId) {
    const { data: assignedLeaders } = await supabase
      .from('group_leaders')
      .select('leader_id')
      .eq('group_id', currentGroupId);

    const assignedIds = new Set((assignedLeaders || []).map((l) => l.leader_id));
    return (data || []).map((leader) => ({
      ...leader,
      alreadyAssigned: assignedIds.has(leader.id),
    }));
  }

  return data || [];
}

/**
 * Get leaderboard for a group (all members + leaders ranked by devotion count)
 */
export async function getGroupLeaderboard(groupId, startDate, endDate) {
  // Get all group members
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('group_id', groupId);

  if (membersError) {
    console.error('Failed to fetch group members:', membersError.message);
    return [];
  }

  // Get devotion counts
  const leaderboard = await Promise.all(
    (members || []).map(async (member) => {
      const { count } = await supabase
        .from('devotions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.id)
        .gte('devotion_date', formatDateISO(startDate))
        .lte('devotion_date', formatDateISO(endDate));

      return {
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        role: member.role,
        devotionCount: count || 0,
      };
    })
  );

  // Sort by devotion count descending
  return leaderboard.sort((a, b) => b.devotionCount - a.devotionCount);
}

/**
 * Subscribe to realtime devotion changes in a group (for live leaderboard)
 */
export function subscribeToGroupDevotions(groupId, onDevotionChange) {
  const channel = supabase
    .channel(`devotions:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'devotions',
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => onDevotionChange(payload.new)
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from channel
 */
export function unsubscribeChannel(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
