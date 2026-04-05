import { supabase } from '../lib/supabase';
import { formatDateISO } from '../utils/formatDate';

/**
 * Get all groups where the user is a leader
 */
export async function getLeaderGroups(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      joined_at,
      groups (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq('user_id', userId)
    .eq('role', 'leader')
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch leader groups:', error.message);
    return [];
  }

  return (data || []).map((entry) => ({
    id: entry.groups.id,
    name: entry.groups.name,
    description: entry.groups.description,
    created_at: entry.groups.created_at,
    leader_since: entry.joined_at,
  }));
}

/**
 * Get all groups where the user is a member
 */
export async function getUserGroups(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      role,
      joined_at,
      groups (
        id,
        name,
        description,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user groups:', error.message);
    return [];
  }

  return (data || []).map((entry) => ({
    id: entry.groups.id,
    name: entry.groups.name,
    description: entry.groups.description,
    created_at: entry.groups.created_at,
    role: entry.role,
    joined_at: entry.joined_at,
  }));
}

/**
 * Search groups by name with partial matching
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
      group_members!inner (
        user_id,
        role,
        profiles:profiles (
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

  return (data || []).map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    created_at: group.created_at,
    leaders: (group.group_members || [])
      .filter((gm) => gm.role === 'leader' && gm.profiles)
      .map((gm) => ({
        id: gm.profiles.id,
        first_name: gm.profiles.first_name,
        last_name: gm.profiles.last_name,
        email: gm.profiles.email,
      })),
  }));
}

/**
 * Create a new group (leader or admin)
 */
export async function createGroup(name, description = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name, description })
    .select()
    .single();

  if (groupError) {
    if (groupError.code === '23505') {
      throw new Error('A group with this name already exists');
    }
    throw new Error(groupError.message || 'Failed to create group');
  }

  // Add creator as leader
  await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'leader' });
  return group;
}

/**
 * Join a group (member)
 */
export async function joinGroup(groupId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    throw new Error('You are already a member of this group');
  }

  const { data, error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: user.id, role: 'member' })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Failed to join group');
  return data;
}

/**
 * Leave a group
 */
export async function leaveGroup(groupId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message || 'Failed to leave group');
}

/**
 * Get ALL group members (leaders + members)
 * FIXED: Uses 2-Step Fetch to bypass Join issues
 */
export async function getGroupMembers(groupId) {
  console.log('🔍 Fetching members for group:', groupId);
  
  // Step 1: Fetch the list of members (user IDs and roles)
  const { data: memberships, error: memError } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId);

  if (memError) {
    console.error('❌ Error fetching group_members:', memError.message);
    return [];
  }

  console.log('📦 Memberships found:', memberships);

  if (!memberships || memberships.length === 0) {
    console.warn('⚠️ No members found in group_members table.');
    return [];
  }

  // Step 2: Fetch profile details for these users separately
  const userIds = memberships.map(m => m.user_id);
  
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, avatar_url')
    .in('id', userIds);

  if (profError) {
    console.error('❌ Error fetching profiles:', profError.message);
    return [];
  }

  console.log('👤 Profiles found:', profiles);

  // Step 3: Combine them manually
  const members = memberships.map(membership => {
    const profile = profiles?.find(p => p.id === membership.user_id);
    
    if (!profile) {
      console.warn(`⚠️ Profile missing for user_id: ${membership.user_id}`);
      return null;
    }

    return {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      role: profile.role,
      member_role: membership.role,
      avatar_url: profile.avatar_url,
      joined_at: membership.joined_at,
    };
  }).filter(Boolean); // Remove nulls

  console.log('✅ Final processed members:', members);
  return members;
}

/**
 * Get group leaders for a group
 */
export async function getGroupLeaders(groupId) {
  // Reuse getGroupMembers and filter
  const members = await getGroupMembers(groupId);
  return members.filter(m => m.member_role === 'leader');
}

/**
 * Add a co-leader to a group
 */
export async function addCoLeader(groupId, leaderId) {
  const { data, error } = await supabase
    .from('group_members')
    .upsert({
      group_id: groupId,
      user_id: leaderId,
      role: 'leader',
    }, { onConflict: 'group_id,user_id' })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to add co-leader');
  }

  return data;
}

/**
 * Remove a member from a group (used for leaders and members)
 */
export async function removeMember(groupId, userId) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message || 'Failed to remove member');
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
      .from('group_members')
      .select('user_id')
      .eq('group_id', currentGroupId)
      .eq('role', 'leader');

    const assignedIds = new Set((assignedLeaders || []).map((l) => l.user_id));
    return (data || []).map((leader) => ({
      ...leader,
      alreadyAssigned: assignedIds.has(leader.id),
    }));
  }

  return data || [];
}

/**
 * Get leaderboard for a group
 */
export async function getGroupLeaderboard(groupId, startDate, endDate) {
  console.log('🔍 getGroupLeaderboard called with:', { groupId, startDate, endDate });
  
  // Get all group members
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select(`
      user_id,
      profiles (id, first_name, last_name, role)
    `)
    .eq('group_id', groupId);

  if (membersError) {
    console.error('❌ Failed to fetch group members:', membersError.message);
    return [];
  }

  console.log('👥 Group members fetched:', members?.length);
  console.log('📋 Members details:', members.map(m => ({
    user_id: m.user_id,
    profile_id: m.profiles?.id,
    name: `${m.profiles?.first_name} ${m.profiles?.last_name}`
  })));

  // Get devotion counts
  const leaderboard = await Promise.all(
    (members || []).map(async (member) => {
      const userId = member.user_id;
      console.log(`📊 Querying devotions for user_id: ${userId}, name: ${member.profiles?.first_name} ${member.profiles?.last_name}, date range: ${startDate} to ${endDate}`);
      
      // Try a direct query to see what's in the database
      const { data: allDevotions, error: allError } = await supabase
        .from('devotions')
        .select('id, devotion_date')
        .eq('user_id', userId)
        .limit(10);
      
      if (allError) {
        console.error(`❌ Error fetching all devotions for user ${userId}:`, allError.message);
      } else {
        console.log(`📝 ALL devotions for user ${userId}:`, allDevotions?.map(d => d.devotion_date));
      }
      
      // Now try the filtered query
      const { count, error, data } = await supabase
        .from('devotions')
        .select('id, devotion_date', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('devotion_date', startDate)
        .lte('devotion_date', endDate);

      if (error) {
        console.error(`❌ Error counting devotions for user ${userId}:`, error.message);
      } else {
        console.log(`✅ Filtered devotion count for user ${userId} (${member.profiles?.first_name}):`, count);
        console.log(`📝 Filtered data returned:`, data);
      }

      return {
        id: member.profiles.id,
        first_name: member.profiles.first_name,
        last_name: member.profiles.last_name,
        role: member.profiles.role,
        devotionCount: count || 0,
      };
    })
  );

  console.log('🏆 Final leaderboard:', leaderboard);

  // Sort by devotion count descending
  return leaderboard.sort((a, b) => b.devotionCount - a.devotionCount);
}

/**
 * Subscribe to realtime devotion changes in a group
 * Listens to all devotion inserts (no group_id filter since it's removed)
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
