import React from 'react';
import { MoreVertical, Phone, Video } from 'lucide-react';
import { Conversation, Message } from '../../../types/messaging';
import { Button } from '../../../components/shared/AuraButton';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
  activeConv: Conversation;
  messages: Message[];
  currentUserId: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  activeConv, 
  messages, 
  currentUserId,
  scrollRef 
}) => {
  const participantName = activeConv.participant?.fullName || 'Selected conversation';
  const initials = participantName
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <main className="surface-card flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] p-4">
        <div className="flex min-w-0 items-center gap-3">
          {activeConv.participant?.avatarUrl ? (
            <img
              src={activeConv.participant.avatarUrl}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              alt=""
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">{participantName}</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {activeConv.participant?.status === 'online' ? 'Online' : 'Offline'} - {messages.length} loaded
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon" aria-label="Voice calls unavailable" title="Voice calls unavailable" disabled>
            <Phone size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Video calls unavailable" title="Video calls unavailable" disabled>
            <Video size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="More messaging actions unavailable" title="More actions unavailable" disabled>
            <MoreVertical size={16} />
          </Button>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="custom-scrollbar flex-1 space-y-3 overflow-y-auto bg-[var(--bg-secondary)] p-4"
        role="log"
        aria-live="polite"
        aria-label={`Messages with ${participantName}`}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === currentUserId} />
        ))}
      </div>
    </main>
  );
};

export default React.memo(ChatWindow);
