import type { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PageHeader } from '../shared/PageHeader';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PageTemplateProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  showHeader?: boolean;
  className?: string;
  contentClassName?: string;
  mainAriaLabel?: string;
}

export function PageTemplate({
  title,
  subtitle,
  children,
  actions,
  showHeader = true,
  className,
  contentClassName,
  mainAriaLabel,
}: PageTemplateProps) {
  return (
    <div
      className={cn('min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]', className)}
      data-ui="page-template"
      data-slot="page-template"
    >
      {showHeader && (
        <PageHeader
          title={title}
          description={subtitle}
          actions={actions}
        />
      )}
      <main
        aria-label={mainAriaLabel ?? `${title} content`}
        className={cn('min-w-0', contentClassName)}
        data-ui="page-template-content"
        data-slot="page-template-content"
      >
        {children}
      </main>
    </div>
  );
}
