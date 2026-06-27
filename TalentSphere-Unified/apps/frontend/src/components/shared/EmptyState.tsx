import React from 'react';
import { InboxIcon } from 'lucide-react';
import { Button } from './AuraButton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => {
  return (
    <div className={`surface-panel flex flex-col items-center justify-center px-4 py-14 text-center ${className || ''}`}>
      <div className="mb-4 text-[var(--text-muted)]">
        {icon || <InboxIcon className="h-12 w-12" />}
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
