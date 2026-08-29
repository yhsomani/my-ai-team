import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      icon,
      id,
      required,
      'aria-describedby': ariaDescribedBy,
      'aria-errormessage': ariaErrorMessage,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const helperTextId = helperText && !error ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, errorId || helperTextId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="flex flex-col gap-1.5 w-full" data-ui="input-field" data-slot="input-field">
        {label && (
          <div className="flex items-center gap-0.5" data-ui="input-label-row" data-slot="input-label-row">
            <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-primary)]" data-ui="input-label" data-slot="input-label">
              {label}
            </label>
            {required && <span aria-hidden="true" className="text-destructive" data-ui="input-required-marker" data-slot="input-required-marker">*</span>}
          </div>
        )}
        <div className="relative" data-ui="input-control" data-slot="input-control">
          {icon && (
            <div
              data-ui="input-icon"
              data-slot="input-icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-describedby={describedBy}
            aria-errormessage={error ? (ariaErrorMessage || errorId) : ariaErrorMessage}
            aria-invalid={ariaInvalid ?? (error ? true : undefined)}
            data-ui="input"
            data-slot="input"
            className={cn(
              'w-full h-9 rounded-lg border bg-transparent px-3 text-sm',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-10',
              error
                ? 'border-destructive focus:ring-destructive/20 focus:border-destructive'
                : 'border-[var(--border-default)] hover:border-[var(--border-strong)]',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="text-xs text-destructive" data-ui="input-error" data-slot="input-error">{error}</p>
        )}
        {helperText && !error && (
          <p id={helperTextId} className="text-xs text-[var(--text-muted)]" data-ui="input-helper" data-slot="input-helper">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Backward-compatible alias
export const AuraInput = Input;
