import { supabase } from '../lib/supabase';
import { MESSAGES_PER_PAGE } from '../lib/constants';

/**
 * Get conversation with a user
 */
export async function getConversation(currentUserId, otherUserId, page = 0) {
  const offset = page * MESSAGES_PER_PAGE;

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + MESSAGES_PER_PAGE - 1);

  if (error) {
    console.error('Failed to fetch conversation:', error.message);
    return [];
  }

  // Filter to only include messages between these two users
  const filtered = data.filter(
    (m) =>
      (m.sender_id === currentUserId && m.receiver_id === otherUserId) ||
      (m.sender_id === otherUserId && m.receiver_id === currentUserId)
  );

  return filtered.reverse();
}

/**
 * Send a message
 */
export async function sendMessage(senderId, receiverId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to send message');
  }

  return data;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(currentUserId, senderId) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('sender_id', senderId)
    .eq('receiver_id', currentUserId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to mark messages as read:', error.message);
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(currentUserId) {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', currentUserId)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to get unread count:', error.message);
    return 0;
  }

  return count || 0;
}

/**
 * Get recent conversations (latest message per user)
 */
export async function getRecentConversations(currentUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch messages:', error.message);
    return [];
  }

  // Group by conversation partner
  const conversations = {};

  for (const msg of data) {
    const partnerId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;

    if (!conversations[partnerId]) {
      conversations[partnerId] = {
        partnerId,
        lastMessage: msg,
        unreadCount: 0,
      };
    }

    if (msg.receiver_id === currentUserId && !msg.is_read) {
      conversations[partnerId].unreadCount++;
    }
  }

  return Object.values(conversations).sort(
    (a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
  );
}

/**
 * Search users by name
 */
export async function searchUsers(query, currentUserId) {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .neq('id', currentUserId)
    .limit(10);

  if (error) {
    console.error('Failed to search users:', error.message);
    return [];
  }

  return data;
}

/**
 * Get friends list
 */
export async function getFriends(currentUserId) {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      friend_id,
      profiles!friendships_friend_id_fkey (
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .eq('user_id', currentUserId);

  if (error) {
    console.error('Failed to fetch friends:', error.message);
    return [];
  }

  return data.map((f) => f.profiles);
}

/**
 * Send friend request
 */
export async function sendFriendRequest(senderId, receiverId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: senderId, receiver_id: receiverId })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to send friend request');
  }

  return data;
}

/**
 * Accept friend request
 */
export async function acceptFriendRequest(requestId, senderId, receiverId) {
  // Update request status
  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Create bidirectional friendships
  const { error: insertError } = await supabase.from('friendships').insert([
    { user_id: senderId, friend_id: receiverId },
    { user_id: receiverId, friend_id: senderId },
  ]);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

/**
 * Subscribe to realtime messages for a conversation
 */
export function subscribeToConversation(currentUserId, otherUserId, onNewMessage) {
  const channel = supabase
    .channel(`messages:${currentUserId}:${otherUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${otherUserId}`,
      },
      (payload) => {
        if (payload.new.receiver_id === currentUserId) {
          onNewMessage(payload.new);
        }
      }
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
