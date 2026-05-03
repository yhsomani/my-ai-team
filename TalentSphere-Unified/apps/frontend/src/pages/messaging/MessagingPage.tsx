import React, { useState, useEffect } from 'react';
import { Search, Send, Phone, Video, MoreVertical } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchConversations, fetchMessages, setActiveConversation, sendMessage, selectAllConversations } from '../../store/slices/messagingSlice';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';

const MessagingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector(selectAllConversations);
  const { activeConversationId, messages, status } = useAppSelector((state) => state.messaging);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchConversations());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (activeConversationId) {
      dispatch(fetchMessages(activeConversationId));
    }
  }, [dispatch, activeConversationId]);

  const filteredConvos = conversations.filter(c =>
    c.participant?.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeConvo = conversations.find(c => c.id === activeConversationId);

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeConversationId) return;
    dispatch(sendMessage({ conversationId: activeConversationId, content: messageText }));
    setMessageText('');
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <PageHeader title="Messages" description="Chat with your connections." />

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversation List */}
        <Card className="w-80 shrink-0 flex flex-col overflow-hidden hidden md:flex">
          <div className="p-3 border-b border-[var(--border-default)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
              <input
                type="text"
                placeholder="Search..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-default)]">
            {status === 'loading' && [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full m-1" />)}
            {filteredConvos.map((convo) => (
              <button
                key={convo.id}
                onClick={() => dispatch(setActiveConversation(convo.id))}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                  activeConversationId === convo.id ? 'bg-accent/5' : 'hover:bg-[var(--bg-primary)]'
                }`}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-semibold">
                    {convo.participant?.fullName.split(' ').map(n => n[0]).join('')}
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
        </Card>

        {/* Chat Window */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
                    {activeConvo.participant?.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{activeConvo.participant?.fullName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{activeConvo.participant?.status === 'online' ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon"><Phone size={16} /></Button>
                  <Button variant="ghost" size="icon"><Video size={16} /></Button>
                  <Button variant="ghost" size="icon"><MoreVertical size={16} /></Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm ${
                      msg.senderId === 'me'
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-bl-sm'
                    }`}>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-[var(--border-default)]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 h-10 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={!messageText.trim()}>
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState 
                title="Select a conversation" 
                description="Choose a contact from the list to start messaging." 
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MessagingPage;
