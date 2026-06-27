import React, { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Conversation } from '../../../types/messaging';

interface ConversationListProps {
  conversations: Conversation[];
  activeConvId: string | null;
  onSelect: (conv: Conversation) => void;
  isLoading: boolean;
}

const getParticipantInitials = (name?: string) => {
  const initials = (name || 'User')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'U';
};

export const ConversationList: React.FC<ConversationListProps> = ({ 
  conversations, 
  activeConvId, 
  onSelect, 
  isLoading 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return conversations;

    return conversations.filter(conversation => (
      (conversation.participant?.fullName || '').toLowerCase().includes(normalizedSearch) ||
      (conversation.lastMessage?.content || '').toLowerCase().includes(normalizedSearch)
    ));
  }, [conversations, searchTerm]);

  return (
    <aside className="surface-card flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="surface-panel rounded-none border-x-0 border-t-0 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">Conversations</h2>
            <p className="text-xs text-[var(--text-secondary)]">{conversations.length} loaded</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
          <input 
            type="text"
            aria-label="Search conversations"
            placeholder="Search..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-9 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      <div className="custom-scrollbar flex-1 divide-y divide-[var(--border-default)] overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[var(--text-secondary)]">
            <Loader2 size={20} className="animate-spin text-accent" />
            <span>Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            {searchTerm ? 'No conversations match your search.' : 'No conversations yet.'}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <button 
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`flex min-h-20 w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                activeConvId === conv.id 
                  ? 'bg-accent/10'
                  : 'hover:bg-[var(--bg-primary)]'
              }`}
            >
              <div className="relative">
                {conv.participant?.avatarUrl ? (
                  <img
                    src={conv.participant.avatarUrl}
                    className="h-9 w-9 rounded-full object-cover"
                    alt=""
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                    {getParticipantInitials(conv.participant?.fullName)}
                  </div>
                )}
                {conv.participant?.status === 'online' && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-secondary)] bg-success" />
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {conv.participant?.fullName || 'Unknown contact'}
                  </h3>
                  {Boolean(conv.unreadCount) && (
                    <span
                      className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-semibold text-accent-foreground"
                      aria-label={`${conv.unreadCount} unread ${conv.unreadCount === 1 ? 'message' : 'messages'}`}
                    >
                      {conv.unreadCount && conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-[var(--text-secondary)]">
                  {conv.lastMessage?.content || 'No messages yet'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
};

export default React.memo(ConversationList);
