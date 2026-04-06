import { supabase, DEVOTION_BUCKET } from '../lib/supabase';
import { formatDateISO } from '../utils/formatDate';
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '../lib/constants';

/**
 * Submit a devotion with server-enforced timestamp
 * Uses the RPC function to ensure server-time integrity
 */
export async function submitDevotion(imageFile, notes = '', dateStr = null) {
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 2. Verify user has at least one group membership
  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (membershipError || !membership) {
    throw new Error('You must join a group before submitting a devotion');
  }

  // 3. Upload image if provided
  let imageUrl = null;
  if (imageFile) {
    imageUrl = await uploadDevotionImage(user.id, imageFile);
  }

  // 4. Submit devotion using server-time function
  const { data, error } = await supabase.rpc('submit_devotion', {
    p_user_id: user.id,
    p_image_url: imageUrl,
    p_notes: notes,
    p_date: dateStr,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already submitted a devotion for this date');
    }
    throw new Error(error.message || 'Failed to submit devotion');
  }

  return data;
}

/**
 * Submit a text-based devotion with rich text content
 */
export async function submitTextDevotion(content, dateStr = null) {
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 2. Verify user has at least one group membership
  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (membershipError || !membership) {
    throw new Error('You must join a group before submitting a devotion');
  }

  // 3. Submit text devotion
  const { data, error } = await supabase.rpc('submit_text_devotion', {
    p_user_id: user.id,
    p_content: content,
    p_date: dateStr,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('You already submitted a devotion for this date');
    }
    throw new Error(error.message || 'Failed to submit devotion');
  }

  return data;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadDevotionImage(userId, file) {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be less than 2MB');
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(DEVOTION_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message || 'Failed to upload image');
  }

  const { data: { publicUrl } } = supabase.storage
    .from(DEVOTION_BUCKET)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Get user's devotions for a date range
 */
export async function getDevotionsByRange(userId, startDate, endDate) {
  const { data, error } = await supabase
    .from('devotions')
    .select('id, devotion_date, image_url, notes, created_at')
    .eq('user_id', userId)
    .gte('devotion_date', formatDateISO(startDate))
    .lte('devotion_date', formatDateISO(endDate))
    .order('devotion_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch devotions:', error.message);
    return [];
  }

  return data;
}

/**
 * Get user's devotions for a specific month
 */
export async function getDevotionsForMonth(userId, year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  return getDevotionsByRange(userId, startDate, endDate);
}

/**
 * Get devotion count for a time period
 */
export async function getDevotionCount(userId, startDate, endDate) {
  const { count, error } = await supabase
    .from('devotions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('devotion_date', formatDateISO(startDate))
    .lte('devotion_date', formatDateISO(endDate));

  if (error) {
    console.error('Failed to count devotions:', error.message);
    return 0;
  }

  return count || 0;
}

/**
 * Get all devotions for a group (leader view)
 */
export async function getGroupDevotions(groupId, startDate, endDate) {
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (membersError) {
    console.error('Failed to fetch group members:', membersError.message);
    return [];
  }

  if (!members || members.length === 0) {
    return [];
  }

  const userIds = members.map(m => m.user_id);

  const { data, error } = await supabase
    .from('devotions')
    .select('id, user_id, devotion_date, image_url, notes, created_at')
    .in('user_id', userIds)
    .gte('devotion_date', formatDateISO(startDate))
    .lte('devotion_date', formatDateISO(endDate))
    .order('devotion_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch group devotions:', error.message);
    return [];
  }

  return data;
}

/**
 * Get devotion stats for a user
 */
export async function getDevotionStats(userId) {
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(today.getDate() - daysSinceMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const { count: weekly } = await supabase
    .from('devotions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('devotion_date', formatDateISO(startOfWeek));

  const { count: monthly } = await supabase
    .from('devotions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('devotion_date', formatDateISO(startOfMonth));

  const { count: yearly } = await supabase
    .from('devotions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('devotion_date', formatDateISO(startOfYear));

  return {
    weekly: weekly || 0,
    monthly: monthly || 0,
    yearly: yearly || 0,
  };
}

/**
 * Get leaderboard for a group
 */
export async function getLeaderboard(groupId) {
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id, profiles:user_id(first_name, last_name, role)')
    .eq('group_id', groupId);

  if (membersError) {
    console.error('Failed to fetch group members:', membersError.message);
    return [];
  }

  if (!members || members.length === 0) {
    return [];
  }

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const leaderboard = await Promise.all(
    members.map(async (member) => {
      const { count } = await supabase
        .from('devotions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.user_id)
        .gte('devotion_date', formatDateISO(startOfMonth));

      return {
        id: member.user_id,
        first_name: member.profiles?.first_name || 'Unknown',
        last_name: member.profiles?.last_name || '',
        role: member.profiles?.role || 'member',
        devotionCount: count || 0,
      };
    })
  );

  return leaderboard.sort((a, b) => b.devotionCount - a.devotionCount);
}

/**
 * Subscribe to realtime devotion changes in a group
 */
export function subscribeToGroupDevotions(groupId, callback) {
  const channel = supabase
    .channel(`devotions:${groupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'devotions',
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribeFromGroupDevotions(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
