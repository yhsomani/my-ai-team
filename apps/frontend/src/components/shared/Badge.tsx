import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
  description?: React.ReactNode;
}

const badgeVariants: Record<string, string> = {
  default: 'bg-accent/10 text-accent border-accent/20',
  success: 'bg-success-muted text-success border-success/20',
  warning: 'bg-warning-muted text-warning border-warning/20',
  destructive: 'bg-destructive-muted text-destructive border-destructive/20',
  outline: 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)]',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', description, children, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedDescriptionId = React.useId();
    const descriptionId = description ? `${generatedDescriptionId}-description` : undefined;
    const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(' ') || undefined;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex max-w-full min-w-0 items-center rounded-md border px-2 py-0.5 text-left text-xs font-medium leading-5 transition-colors',
          badgeVariants[variant],
          className
        )}
        data-ui="badge"
        data-slot="badge"
        data-variant={variant}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
        {description && (
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Backward-compatible alias used by old pages
export const AuraBadge = Badge;
