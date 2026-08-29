import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, badge, className }) => {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <header
      data-ui="page-header"
      data-slot="page-header"
      className={`mb-6 flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-end sm:justify-between ${className || ''}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div data-ui="page-header-copy" data-slot="page-header-copy" className="min-w-0 space-y-1.5">
        <div data-ui="page-header-title-row" data-slot="page-header-title-row" className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 id={titleId} className="text-2xl font-semibold leading-tight text-[var(--text-primary)]">{title}</h1>
          {badge}
        </div>
        {description && (
          <p id={descriptionId} className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
      {actions && (
        <div data-ui="page-header-actions" data-slot="page-header-actions" className="flex shrink-0 flex-wrap items-center gap-2" role="group" aria-label={`${title} actions`}>
          {actions}
        </div>
      )}
    </header>
  );
};
