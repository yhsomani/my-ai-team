import React from 'react';
import { Sparkles, Settings, Trash2 } from 'lucide-react';
import { AuraButton } from '../../../components/shared/AuraButton';

export const ChatHeader: React.FC = () => {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 border-b border-[var(--border-default)] bg-[var(--bg-panel)] px-5 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-[var(--accent-foreground)]">
          <Sparkles size={28} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">AI Assistant</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-accent">Draft guidance active</span>
            <span className="text-xs text-[var(--text-muted)]">Review required before workflow handoff</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AuraButton variant="ghost" size="icon" aria-label="AI assistant settings"><Settings size={20} /></AuraButton>
        <AuraButton variant="ghost" size="icon" aria-label="Clear AI assistant history"><Trash2 size={20} /></AuraButton>
      </div>
    </header>
  );
};

export default React.memo(ChatHeader);
