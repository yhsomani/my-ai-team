import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children?: React.ReactNode;
}

const variants: Record<string, string> = {
  default: 'bg-accent text-accent-foreground hover:bg-accent-hover',
  secondary: 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)]',
  outline: 'border border-[var(--border-default)] bg-transparent hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]',
  ghost: 'hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  destructive: 'bg-destructive text-[var(--accent-foreground)] hover:bg-destructive/90',
  link: 'text-accent hover:text-accent-hover underline-offset-4 hover:underline p-0 h-auto',
};

const sizes: Record<string, string> = {
  sm: 'min-h-8 px-3 py-1 text-xs gap-1.5',
  md: 'min-h-9 px-4 py-1.5 text-sm gap-2',
  lg: 'min-h-11 px-6 py-2 text-sm gap-2',
  icon: 'h-9 w-9 p-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        data-ui="button"
        data-slot="button"
        data-loading={isLoading ? 'true' : undefined}
        data-variant={variant}
        data-size={size}
        className={cn(
          'inline-flex max-w-full min-w-0 items-center justify-center rounded-md text-center font-medium leading-tight transition-colors whitespace-normal break-words',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
          'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98] transition-all duration-150',
          variant !== 'link' && sizes[size],
          variants[variant],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" focusable="false" />
            {size !== 'icon' && children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Keep backward-compatible alias
export const AuraButton = Button;
