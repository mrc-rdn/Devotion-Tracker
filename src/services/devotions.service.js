import { supabase, DEVOTION_BUCKET } from '../lib/supabase';
import { formatDateISO } from '../utils/formatDate';
import { MAX_IMAGE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '../lib/constants';

/**
 * Submit a devotion with server-enforced timestamp
 * Uses the RPC function to ensure server-time integrity
 */
export async function submitDevotion(imageFile, notes = '') {
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
  });

  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error('You already submitted a devotion for today');
    }
    throw new Error(error.message || 'Failed to submit devotion');
  }

  return data;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadDevotionImage(userId, file) {
  // Validate file
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image must be less than 2MB');
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed');
  }

  // Generate unique filename
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

  // Get public URL
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
 * Uses relational joins through group_members instead of devotions.group_id
 */
export async function getGroupDevotions(groupId, startDate, endDate) {
  // Step 1: Get all user_ids in this group
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

  // Step 2: Fetch devotions for those users
  const { data, error } = await supabase
    .from('devotions')
    .select(`
      id,
      devotion_date,
      image_url,
      notes,
      created_at,
      user_id,
      profiles!inner (first_name, last_name)
    `)
    .in('user_id', userIds)
    .gte('devotion_date', formatDateISO(startDate))
    .lte('devotion_date', formatDateISO(endDate))
    .order('devotion_date', { ascending: false });

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
  const now = new Date();
  // Monday to Sunday (Monday = 1, Sunday = 0)
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [weekCount, monthCount, yearCount, totalCount] = await Promise.all([
    getDevotionCount(userId, weekStart, now),
    getDevotionCount(userId, monthStart, now),
    getDevotionCount(userId, yearStart, now),
    getDevotionCount(userId, new Date(0), now),
  ]);

  return {
    weekly: weekCount,
    monthly: monthCount,
    yearly: yearCount,
    total: totalCount,
  };
}

/**
 * Get leaderboard for a group (dummy data fallback)
 */
export async function getLeaderboard(groupId) {
  // Get group members from group_members table
  const { data: membersData, error: membersError } = await supabase
    .from('group_members')
    .select(`
      user_id,
      profiles (id, first_name, last_name)
    `)
    .eq('group_id', groupId);

  if (membersError) {
    console.error('Failed to fetch leaderboard:', membersError.message);
    return [];
  }

  // Get devotion counts for each member
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const members = await Promise.all(
    (membersData || []).map(async (member) => {
      const count = await getDevotionCount(member.profiles.id, monthStart, now);
      return {
        id: member.profiles.id,
        first_name: member.profiles.first_name,
        last_name: member.profiles.last_name,
        devotionCount: count,
      };
    })
  );

  // Sort by devotion count
  return members.sort((a, b) => b.devotionCount - a.devotionCount);
}
