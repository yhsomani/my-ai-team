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
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={actions}
        />
      )}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}