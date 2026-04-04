import { supabase } from '../lib/supabase';

/**
 * Get all groups (for signup dropdown)
 */
export async function getGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description')
    .order('name');

  if (error) {
    console.error('Failed to fetch groups:', error.message);
    return [];
  }

  return data;
}

/**
 * Get a single group by ID
 */
export async function getGroupById(groupId) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) {
    console.error('Failed to fetch group:', error.message);
    return null;
  }

  return data;
}
