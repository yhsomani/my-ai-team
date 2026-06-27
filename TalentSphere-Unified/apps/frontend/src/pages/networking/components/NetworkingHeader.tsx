import React from 'react';
import { Network } from 'lucide-react';
import { Badge } from '../../../components/shared/Badge';

export const NetworkingHeader: React.FC = () => {
  return (
    <header className="surface-panel p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="success">Network active</Badge>
            <span className="text-xs text-[var(--text-secondary)]">Suggestions, requests, and reminders</span>
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Network</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Find relevant professionals, review connection requests, and manage follow-up reminders from one workspace.
          </p>
        </div>

        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/60 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Network size={18} />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">Connection workspace</p>
              <p className="text-xs text-[var(--text-muted)]">Requests and reminders</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(NetworkingHeader);
