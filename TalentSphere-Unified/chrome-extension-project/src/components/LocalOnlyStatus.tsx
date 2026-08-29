import React from 'react';
import { CloudOff, HardDrive } from 'lucide-react';

interface LocalOnlyStatusProps {
  id: string;
  compact?: boolean;
  className?: string;
}

export const localOnlyStatusCopy = {
  label: 'Local only',
  description: 'Tracked jobs, scanned drafts, prep cards, settings, and diagnostics stay in this browser. Cloud sync is not connected.',
};

export const LocalOnlyStatus: React.FC<LocalOnlyStatusProps> = ({ id, compact = false, className = '' }) => (
  <div
    id={id}
    role="status"
    aria-label="Extension local-only storage status"
    data-ui="extension-local-only-status"
    className={`flex items-start gap-2 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] p-3 ${className}`}
  >
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--ext-accent-muted)] text-[var(--ext-accent)]" aria-hidden="true">
      {compact ? <HardDrive className="h-3 w-3" aria-hidden="true" focusable="false" /> : <CloudOff className="h-3 w-3" aria-hidden="true" focusable="false" />}
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-semibold text-[var(--ext-text)]">{localOnlyStatusCopy.label}</span>
      {!compact && (
        <span className="mt-0.5 block text-[9px] leading-relaxed text-[var(--ext-text-secondary)]">
          {localOnlyStatusCopy.description}
        </span>
      )}
    </span>
  </div>
);
