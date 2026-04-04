import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getConversation,
  sendMessage as sendMsg,
  markMessagesAsRead,
  getRecentConversations,
  searchUsers,
  getFriends,
  subscribeToConversation,
  unsubscribeChannel,
} from '../services/messages.service';

export function useMessages(selectedUserId = null) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [recentConversations, setRecentConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // Fetch recent conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getRecentConversations(user.id);
      setRecentConversations(data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, [user]);

  // Fetch friends
  const fetchFriends = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getFriends(user.id);
      setFriends(data);
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    }
  }, [user]);

  // Fetch conversation with selected user
  useEffect(() => {
    if (!user || !selectedUserId) return;

    async function loadConversation() {
      setLoading(true);
      try {
        const data = await getConversation(user.id, selectedUserId);
        setMessages(data);

        // Mark messages as read
        await markMessagesAsRead(user.id, selectedUserId);

        // Setup realtime subscription
        if (channelRef.current) {
          unsubscribeChannel(channelRef.current);
        }

        channelRef.current = subscribeToConversation(
          user.id,
          selectedUserId,
          (newMessage) => {
            setMessages((prev) => [...prev, newMessage]);
          }
        );
      } catch (err) {
        console.error('Failed to load conversation:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadConversation();

    return () => {
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, selectedUserId]);

  // Search users
  async function searchUsers(query) {
    if (!user) return;

    try {
      const data = await searchUsers(query, user.id);
      setSearchResults(data);
    } catch (err) {
      console.error('Failed to search users:', err);
    }
  }

  // Send a message
  async function sendMessage(content) {
    if (!user || !selectedUserId) return;

    setSending(true);
    setError(null);

    try {
      const data = await sendMsg(user.id, selectedUserId, content);
      setMessages((prev) => [...prev, data]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message);
      throw err;
    } finally {
      setSending(false);
    }
  }

  // Refresh data
  function refresh() {
    fetchConversations();
    fetchFriends();
  }

  useEffect(() => {
    fetchConversations();
    fetchFriends();
  }, [fetchConversations, fetchFriends]);

  return {
    messages,
    recentConversations,
    searchResults,
    friends,
    loading,
    sending,
    error,
    sendMessage,
    searchUsers,
    refresh,
  };
}
