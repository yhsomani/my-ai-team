import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  role,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}) => {
  const hasExplicitSemantics = role !== undefined || ariaLabel !== undefined || ariaLabelledBy !== undefined;

  return (
    <div
      data-ui="skeleton"
      data-slot="skeleton"
      role={role}
      aria-hidden={ariaHidden ?? (hasExplicitSemantics ? undefined : true)}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        'motion-safe:animate-pulse rounded-lg bg-[var(--border-default)]',
        className
      )}
      {...props}
    />
  );
};
