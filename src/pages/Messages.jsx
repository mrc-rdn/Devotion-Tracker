import { useState, useRef, useEffect } from 'react';
import { Send, Search, Users, MessageSquare, UserPlus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { Card, CardHeader, Badge, EmptyState } from '../components/ui';
import { getRelativeTime } from '../utils/formatDate';
import { sendFriendRequest, acceptFriendRequest } from '../services/messages.service';

export default function Messages() {
  const { user, profile } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const messagesEndRef = useRef(null);

  const {
    messages,
    recentConversations,
    searchResults,
    friends,
    sending,
    error,
    sendMessage,
    searchUsers,
    refresh,
  } = useMessages(selectedUserId);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle search
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers(searchQuery);
    }
  }, [searchQuery]);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      await sendMessage(newMessage);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  async function handleAddFriend(userId) {
    try {
      await sendFriendRequest(user.id, userId);
      refresh();
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  }

  // Get selected user info
  const selectedUser = [
    ...recentConversations.map((c) => ({
      id: c.partnerId,
      name: 'User',
    })),
  ].find((u) => u.id === selectedUserId);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Conversations Sidebar */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <CardHeader title="Messages" />

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg transition-colors ${
                showSearch ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowFriends(!showFriends)}
              className={`p-2 rounded-lg transition-colors ${
                showFriends ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="px-4 pb-3">
              <input
                type="text"
                placeholder="Search users..."
                className="input-field"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Search Results */}
          {showSearch && searchResults.length > 0 && (
            <div className="px-4 pb-3 max-h-48 overflow-y-auto scrollbar-thin">
              {searchResults.map((result) => {
                const isFriend = friends?.some((f) => f.id === result.id);
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-semibold text-primary-700">
                      {result.first_name[0]}{result.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {result.first_name} {result.last_name}
                      </p>
                      <Badge color="gray">{result.role}</Badge>
                    </div>
                    {!isFriend && (
                      <button
                        onClick={() => handleAddFriend(result.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                        title="Add friend"
                      >
                        <UserPlus className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedUserId(result.id);
                        setShowSearch(false);
                        setSearchQuery('');
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                      title="Message"
                    >
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Friends List */}
          {showFriends && friends?.length > 0 && (
            <div className="px-4 pb-3 max-h-48 overflow-y-auto scrollbar-thin">
              <p className="text-xs font-medium text-gray-500 mb-2">Friends</p>
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => {
                    setSelectedUserId(friend.id);
                    setShowFriends(false);
                  }}
                  className={`w-full flex items-center gap-3 py-2 rounded-lg transition-colors ${
                    selectedUserId === friend.id ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-semibold text-primary-700">
                    {friend.first_name[0]}{friend.last_name[0]}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">
                      {friend.first_name} {friend.last_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Conversations */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {recentConversations.length > 0 ? (
              recentConversations.map((conv) => (
                <button
                  key={conv.partnerId}
                  onClick={() => setSelectedUserId(conv.partnerId)}
                  className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-100 transition-colors text-left ${
                    selectedUserId === conv.partnerId
                      ? 'bg-primary-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-sm font-semibold text-primary-700 flex-shrink-0">
                    {conv.partnerId?.substring(0, 2).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.partnerId?.substring(0, 8)}...
                      </p>
                      <span className="text-xs text-gray-400">
                        {getRelativeTime(conv.lastMessage.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {conv.lastMessage.content}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge color="blue">{conv.unreadCount}</Badge>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Search for users to start chatting
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-sm font-semibold text-primary-700">
                    {selectedUserId?.substring(0, 2).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Chatting with user
                    </p>
                    <p className="text-xs text-green-600">Online</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-3">
                {messages.map((msg) => {
                  const isSent = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={
                          isSent ? 'chat-bubble-sent' : 'chat-bubble-received'
                        }
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            isSent ? 'text-white/70' : 'text-gray-400'
                          }`}
                        >
                          {getRelativeTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Error */}
              {error && (
                <p className="px-6 text-xs text-red-600">{error}</p>
              )}

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="px-6 py-4 border-t border-gray-200 flex items-center gap-3"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="input-field flex-1"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={sending || !newMessage.trim()}
                >
                  {sending ? (
                    <span className="spinner" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a conversation from the sidebar or search for a user to start chatting."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
