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

  // 2. Get user's profile for group_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, group_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Failed to load profile');
  }

  // 3. Upload image if provided
  let imageUrl = null;
  if (imageFile) {
    imageUrl = await uploadDevotionImage(user.id, imageFile);
  }

  // 4. Submit devotion using server-time function
  const { data, error } = await supabase.rpc('submit_devotion', {
    p_user_id: profile.id,
    p_group_id: profile.group_id,
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
 */
export async function getGroupDevotions(groupId, startDate, endDate) {
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
    .eq('group_id', groupId)
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
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('group_id', groupId);

  if (error) {
    console.error('Failed to fetch leaderboard:', error.message);
    return [];
  }

  // Get devotion counts for each member
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const members = await Promise.all(
    (data || []).map(async (member) => {
      const count = await getDevotionCount(member.id, monthStart, now);
      return {
        ...member,
        devotionCount: count,
      };
    })
  );

  // Sort by devotion count
  return members.sort((a, b) => b.devotionCount - a.devotionCount);
}
