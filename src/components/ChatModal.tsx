import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Message, User, Post, Offer } from '@/types';
import { CloseIcon, PaperAirplaneIcon, ShopIcon, UserIcon, PhoneIcon } from './icons/Icons';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  otherUser: User;
  post: Post;
  offer?: Offer;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  otherUser,
  post,
  offer
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (isOpen && currentUser && otherUser && post) {
      loadMessages();
      setupRealtimeSubscription();
      markMessagesAsRead();
    }

    return () => {
      cleanupSubscription();
    };
  }, [isOpen, currentUser?.id, otherUser?.id, post?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupRealtimeSubscription = () => {
    cleanupSubscription();

    const channel = supabase
      .channel(`chat-${post.id}-${currentUser.id}-${otherUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `post_id=eq.${post.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only add if it's part of this conversation
          if (
            (newMsg.sender_id === currentUser.id && newMsg.receiver_id === otherUser.id) ||
            (newMsg.sender_id === otherUser.id && newMsg.receiver_id === currentUser.id)
          ) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            
            // Mark as read if we received it
            if (newMsg.receiver_id === currentUser.id) {
              markMessageAsRead(newMsg.id);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const cleanupSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('post_id', post.id)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('post_id', post.id)
        .eq('receiver_id', currentUser.id)
        .eq('sender_id', otherUser.id);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: otherUser.id,
          post_id: post.id,
          content: messageContent
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for the receiver
      await supabase
        .from('notifications')
        .insert({
          user_id: otherUser.id,
          type: 'new_message',
          title: 'New Message',
          message: `${currentUser.firm_name || currentUser.mobile} sent you a message about "${post.product_name}"`,
          post_id: post.id
        });

    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(msg => {
      const dateKey = new Date(msg.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const handleCall = () => {
    if (otherUser?.mobile) {
      window.location.href = `tel:${otherUser.mobile}`;
    }
  };

  if (!isOpen) return null;

  // Safety check for required data
  if (!currentUser || !otherUser || !post) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 text-center">
          <p className="text-gray-600 mb-4">Unable to load chat. Missing required data.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              {otherUser.is_seller ? (
                <ShopIcon className="w-5 h-5 text-white" />
              ) : (
                <UserIcon className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{otherUser.firm_name || otherUser.mobile}</h3>
              <p className="text-xs text-white/80">
                {otherUser.is_seller ? 'Seller' : 'Buyer'} {otherUser.manager_name ? `• ${otherUser.manager_name}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Call button */}
            <a
              href={`tel:${otherUser.mobile}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title={`Call ${otherUser.mobile}`}
            >
              <PhoneIcon className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Post/Offer context */}
        <div className="bg-gray-50 px-4 py-3 border-b">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Regarding:</span> {post.product_name}
          </p>
          {offer && (
            <p className="text-sm text-green-600 font-medium">
              Offer: ₹{offer.price}
            </p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-center">No messages yet.<br />Start the conversation!</p>
            </div>
          ) : (
            Object.entries(messageGroups).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                <div className="flex items-center justify-center mb-3">
                  <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                    {formatDate(msgs[0].created_at)}
                  </span>
                </div>
                {msgs.map((message) => {
                  const isOwn = message.sender_id === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                          <span className="text-xs">{formatTime(message.created_at)}</span>
                          {isOwn && (
                            <svg className={`w-4 h-4 ${message.is_read ? 'text-blue-200' : 'text-blue-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {message.is_read ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              )}
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
