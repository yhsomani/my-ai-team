import React from 'react';
import { motion } from 'framer-motion';
import { Message } from '../../../types/messaging';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe }) => {
  const timestamp = new Date(message.timestamp);
  const timeLabel = Number.isNaN(timestamp.getTime())
    ? 'Time unavailable'
    : timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, x: isMe ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex max-w-[82%] flex-col gap-1 sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-md px-4 py-2.5 text-sm leading-6 ${
          isMe 
            ? 'bg-accent text-accent-foreground'
            : 'border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
        }`}>
          <p className="break-words">{message.content}</p>
        </div>
        <div className="px-1 text-[10px] text-[var(--text-muted)]">
          <span>{timeLabel}</span>
          {isMe && message.status && <span> - {message.status.toLowerCase()}</span>}
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(MessageBubble);
