import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  maxWidthClassName?: string;
}

const getAuthTitleId = (title: string) => (
  `auth-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-title`
);

const decorativeIconProps = {
  'aria-hidden': true,
  focusable: 'false' as const,
};

export const AuthShell = ({
  title,
  description,
  children,
  footer,
  maxWidthClassName = 'max-w-md',
}: AuthShellProps) => {
  const titleId = getAuthTitleId(title);

  return (
    <main aria-labelledby={titleId} className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 text-[var(--text-primary)] sm:py-12">
      <div className={`mx-auto flex min-h-[calc(100vh-4rem)] w-full ${maxWidthClassName} flex-col justify-center gap-6`}>
        <header className="space-y-4 text-center">
          <Link
            to="/"
            className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
            aria-label="TalentSphere home"
          >
            <Layers {...decorativeIconProps} size={20} />
          </Link>
          <div className="space-y-1">
            <h1 id={titleId} className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          </div>
        </header>

        <section className="surface-card p-5 sm:p-6" role="region" aria-label={`${title} authentication panel`}>
          {children}
        </section>

        <div className="text-center text-sm text-[var(--text-secondary)]" role="navigation" aria-label="Authentication alternate entry">
          {footer}
        </div>
      </div>
    </main>
  );
};
