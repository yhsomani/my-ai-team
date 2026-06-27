import type { ReactNode } from 'react';
import { PageHeader } from '../shared/PageHeader';

interface PageTemplateProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  showHeader?: boolean;
}

export function PageTemplate({
  title,
  subtitle,
  children,
  actions,
  showHeader = true,
}: PageTemplateProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {showHeader && (
        <PageHeader
          title={title}
          description={subtitle}
          actions={actions}
        />
      )}
      <main className="min-w-0">
        {children}
      </main>
    </div>
  );
}
