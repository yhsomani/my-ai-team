import React from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessage } from '../../../types/ai';

interface MessageListProps {
  messages: ChatMessage[];
  isThinking: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isThinking, scrollRef }) => {
  return (
    <div 
      ref={scrollRef}
      className="relative z-10 flex-1 space-y-6 overflow-y-auto px-4 py-6"
    >
      {messages.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center"
        >
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-accent">
            <Sparkles size={40} />
          </div>
          <h3 className="mb-3 text-xl font-semibold text-[var(--text-primary)]">Start an AI Review</h3>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Ask for career guidance, then review each recommendation before applying it in Profile, Resume, Jobs, or Learning.
          </p>
        </motion.div>
      )}

      {messages.map((msg) => (
        <motion.div 
          key={msg.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              msg.role === 'user' 
              ? 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              : 'border-accent/20 bg-accent-muted text-accent'
            }`}>
              {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
            </div>
            <div className="flex flex-col gap-3">
              <div className={`rounded-lg p-4 text-sm leading-relaxed ${
                msg.role === 'user' 
                ? 'border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
                : 'bg-accent text-[var(--accent-foreground)]'
              }`}>
                <div className="max-w-none whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
              </div>
              <div className={`flex items-center gap-2 px-1 text-xs text-[var(--text-muted)] ${msg.role === 'user' ? 'justify-end' : ''}`}>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span aria-hidden="true">·</span>
                <span>{msg.role === 'user' ? 'Prompt sent' : 'Draft response'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {isThinking && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex w-full justify-start"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-muted text-accent">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent/40 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent/60 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
              </div>
              <span className="ml-2 text-xs text-[var(--text-muted)]">Generating draft response...</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default React.memo(MessageList);
