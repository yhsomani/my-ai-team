import React from 'react';
import { InboxIcon } from 'lucide-react';
import { Button } from './AuraButton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <section
      data-ui="empty-state"
      data-slot="empty-state"
      role="region"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={`surface-panel flex flex-col items-center justify-center px-4 py-14 text-center ${className || ''}`}
    >
      <div data-ui="empty-state-icon" data-slot="empty-state-icon" className="mb-4 text-[var(--text-muted)]" aria-hidden="true">
        {icon || <InboxIcon className="h-12 w-12" aria-hidden="true" focusable="false" />}
      </div>
      <h3 id={titleId} data-ui="empty-state-title" data-slot="empty-state-title" className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p id={descriptionId} data-ui="empty-state-description" data-slot="empty-state-description" className="text-sm text-[var(--text-muted)] max-w-sm mb-4">{description}</p>
      {action && (
        <div data-ui="empty-state-action" data-slot="empty-state-action">
          <Button type="button" variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </section>
  );
};
