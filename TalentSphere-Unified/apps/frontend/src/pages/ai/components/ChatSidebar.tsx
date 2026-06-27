import React from 'react';
import { MessageSquare, Shield } from 'lucide-react';
import { AuraBadge as Badge } from '../../../components/shared/AuraCard';
import { AuraButton as Button } from '../../../components/shared/AuraButton';

export const ChatSidebar: React.FC = () => {
  return (
    <aside className="relative z-10 hidden w-80 flex-col space-y-6 border-r border-[var(--border-default)] bg-[var(--bg-panel)] p-5 xl:flex">
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Sessions</h2>
          <Badge variant="outline">Local</Badge>
        </div>
        <Button variant="outline" className="w-full justify-start">
          <MessageSquare size={18} />
          <span>New Chat</span>
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {[
          'Career planning',
          'Market analysis',
          'Skill review',
          'Application draft'
        ].map((chat, i) => (
          <button 
            key={i}
            className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors ${
              i === 0 
              ? 'border border-accent/20 bg-accent-muted text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${i === 0 ? 'bg-accent text-[var(--accent-foreground)]' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                <MessageSquare size={14} />
              </div>
              <span className="truncate text-sm font-medium">{chat}</span>
            </div>
            {i === 0 && <div className="h-1.5 w-1.5 rounded-full bg-success" />}
          </button>
        ))}
      </div>

      <div className="space-y-4 border-t border-[var(--border-default)] pt-5">
        <div className="flex items-center gap-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-primary)] text-[var(--text-muted)]">
            <Shield size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[var(--text-primary)]">Review first</span>
            <span className="text-xs text-[var(--text-muted)]">Suggestions do not mutate records</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default React.memo(ChatSidebar);
