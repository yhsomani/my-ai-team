import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, ArrowLeft, MessageSquare, Search, Send, Phone, RotateCcw, Video, MoreVertical } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { messageReceived } from '../../store/slices/messagingSlice';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchConversations, fetchMessages, setActiveConversation, sendMessage, selectAllConversations } from '../../store/slices/messagingSlice';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';
import type { Message } from '../../types/messaging';

const mapRealtimeMessage = (row: Record<string, any>): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  content: row.content,
  messageType: row.message_type || 'TEXT',
  attachmentUrl: row.attachment_url || undefined,
  status: row.status || 'SENT',
  timestamp: row.created_at,
  readAt: row.read_at || undefined,
});

type LocalMessage = Message & {
  localStatus?: 'sending' | 'failed';
};

const MessagingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const conversations = useAppSelector(selectAllConversations);
  const { activeConversationId, messages, status } = useAppSelector((state) => state.messaging);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileConversations, setShowMobileConversations] = useState(true);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [sendFeedback, setSendFeedback] = useState('');

  useEffect(() => {
    if (status === 'idle' && user) {
      dispatch(fetchConversations(user.id));
    }
  }, [dispatch, status, user]);

  // Real-time listener setup
  useEffect(() => {
    if (activeConversationId) {
      const channel = supabase
        .channel(`public:messages:conversation_id=eq.${activeConversationId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConversationId}` }, (payload) => {
          dispatch(messageReceived(mapRealtimeMessage(payload.new as Record<string, any>)));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [dispatch, activeConversationId]);

  useEffect(() => {
    if (activeConversationId && user) {
      dispatch(fetchMessages({ conversationId: activeConversationId, userId: user.id }));
      setLocalMessages([]);
      setSendFeedback('');
    }
  }, [dispatch, activeConversationId, user]);

  const filteredConvos = conversations.filter(c =>
    (c.participant?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeConvo = conversations.find(c => c.id === activeConversationId);
  const visibleMessages = useMemo<LocalMessage[]>(() => {
    const localIds = new Set(localMessages.map(message => message.id));
    return [
      ...messages.filter(message => !localIds.has(message.id)),
      ...localMessages
    ];
  }, [localMessages, messages]);

  const handleSelectConversation = (conversationId: string) => {
    dispatch(setActiveConversation(conversationId));
    setShowMobileConversations(false);
  };

  const sendMessageWithFeedback = async (content: string, existingLocalId?: string) => {
    if (!content.trim() || !activeConversationId || !user?.id) return;

    const localId = existingLocalId || `local-${Date.now()}`;
    const optimisticMessage: LocalMessage = {
      id: localId,
      conversationId: activeConversationId,
      senderId: user.id,
      content: content.trim(),
      messageType: 'TEXT',
      status: 'SENT',
      timestamp: new Date().toISOString(),
      localStatus: 'sending'
    };

    setSendFeedback('Sending message...');
    setLocalMessages(prev => {
      const withoutExisting = prev.filter(message => message.id !== localId);
      return [...withoutExisting, optimisticMessage];
    });

    try {
      await dispatch(sendMessage({
        conversationId: activeConversationId,
        senderId: user.id,
        content: content.trim(),
        messageType: 'TEXT'
      })).unwrap();
      setLocalMessages(prev => prev.filter(message => message.id !== localId));
      setSendFeedback('Message sent.');
    } catch (error) {
      setLocalMessages(prev => prev.map(message => (
        message.id === localId ? { ...message, localStatus: 'failed' } : message
      )));
      setSendFeedback('Message failed to send. Retry available.');
    }
  };

  const handleSendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const content = messageText.trim();
    if (!content) return;
    setMessageText('');
    await sendMessageWithFeedback(content);
  };

  const retryMessage = async (message: LocalMessage) => {
    await sendMessageWithFeedback(message.content, message.id);
  };

  const getDeliveryLabel = (message: LocalMessage) => {
    if (message.localStatus === 'sending') return 'Sending...';
    if (message.localStatus === 'failed') return 'Failed to send';
    if (message.status === 'READ') return 'Read';
    if (message.status === 'DELIVERED') return 'Delivered';
    return 'Sent';
  };

  const conversationList = (
    <>
      <div className="p-3 border-b border-[var(--border-default)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
          <input
            type="text"
            aria-label="Search conversations"
            placeholder="Search..."
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-default)]">
        {status === 'loading' && [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full m-1" />)}
        {status !== 'loading' && filteredConvos.length === 0 && (
          <div className="p-6 text-center text-sm text-[var(--text-muted)]">
            {searchTerm ? 'No conversations match your search.' : 'No conversations yet.'}
          </div>
        )}
        {filteredConvos.map((convo) => (
          <button
            key={convo.id}
            onClick={() => handleSelectConversation(convo.id)}
            className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
              activeConversationId === convo.id ? 'bg-accent/5' : 'hover:bg-[var(--bg-primary)]'
            }`}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-semibold">
                {(convo.participant?.fullName || 'U').split(' ').map(n => n[0]).join('')}
              </div>
              {convo.participant?.status === 'online' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-[var(--bg-secondary)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{convo.participant?.fullName}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate">{convo.lastMessage?.content || 'No messages yet'}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <PageHeader title="Messages" description="Chat with your connections." />

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversation List */}
        <Card className="w-80 shrink-0 flex flex-col overflow-hidden hidden md:flex">
          {conversationList}
        </Card>

        <Card className={`flex-1 flex-col overflow-hidden md:hidden ${showMobileConversations || !activeConvo ? 'flex' : 'hidden'}`}>
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
            <div>
              <p className="text-sm font-semibold">Conversations</p>
              <p className="text-xs text-[var(--text-muted)]">{filteredConvos.length} available</p>
            </div>
            {activeConvo && (
              <Button variant="outline" size="sm" onClick={() => setShowMobileConversations(false)}>
                Open Chat
              </Button>
            )}
          </div>
          {conversationList}
        </Card>

        {/* Chat Window */}
        <Card className={`flex-1 flex-col overflow-hidden ${showMobileConversations && !activeConvo ? 'hidden md:flex' : 'flex'} ${showMobileConversations && activeConvo ? 'hidden md:flex' : ''}`}>
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Back to conversations"
                    onClick={() => setShowMobileConversations(true)}
                  >
                    <ArrowLeft size={16} />
                  </Button>
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
                    {(activeConvo.participant?.fullName || 'U').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{activeConvo.participant?.fullName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{activeConvo.participant?.status === 'online' ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="Voice calls unavailable" title="Voice calls unavailable" disabled><Phone size={16} /></Button>
                  <Button variant="ghost" size="icon" aria-label="Video calls unavailable" title="Video calls unavailable" disabled><Video size={16} /></Button>
                  <Button variant="ghost" size="icon" aria-label="More messaging actions unavailable" title="More actions unavailable" disabled><MoreVertical size={16} /></Button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
                aria-label={`Messages with ${activeConvo.participant?.fullName || 'selected conversation'}`}
              >
                {visibleMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm ${
                      msg.senderId === user?.id
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-bl-sm'
                    } ${msg.localStatus === 'failed' ? 'border border-destructive bg-destructive/10 text-[var(--text-primary)]' : ''}`}>
                      <p>{msg.content}</p>
                      {msg.senderId === user?.id && (
                        <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-80">
                          {msg.localStatus === 'failed' && <AlertCircle size={12} className="text-destructive" />}
                          <span>{getDeliveryLabel(msg as LocalMessage)}</span>
                          {msg.localStatus === 'failed' && (
                            <button
                              type="button"
                              onClick={() => retryMessage(msg as LocalMessage)}
                              className="inline-flex items-center gap-1 font-medium text-destructive hover:underline"
                            >
                              <RotateCcw size={11} /> Retry
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-[var(--border-default)]">
                <form className="flex gap-2" onSubmit={handleSendMessage}>
                  <label htmlFor="message-composer" className="sr-only">Message text</label>
                  <input
                    id="message-composer"
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    aria-describedby="message-send-status"
                    className="flex-1 h-10 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  />
                  <Button size="icon" type="submit" disabled={!messageText.trim()} aria-label="Send message">
                    <Send size={16} />
                  </Button>
                </form>
                <p id="message-send-status" className="sr-only" aria-live="polite">{sendFeedback}</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState 
                title="Select a conversation" 
                description="Choose a contact from the list to start messaging." 
                icon={<MessageSquare size={24} />}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MessagingPage;
