import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ---------- Card ---------- */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'surface-card max-w-full min-w-0 text-[var(--text-primary)]',
        className
      )}
      data-ui="card"
      data-slot="card"
      {...props}
    />
  )
);
Card.displayName = 'Card';

/* ---------- CardHeader ---------- */
const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex min-w-0 flex-col gap-1.5 p-5 pb-0', className)} data-ui="card-header" data-slot="card-header" {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

/* ---------- CardTitle ---------- */
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base font-semibold leading-tight break-words', className)} data-ui="card-title" data-slot="card-title" {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

/* ---------- CardDescription ---------- */
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-[var(--text-secondary)] break-words', className)} data-ui="card-description" data-slot="card-description" {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

/* ---------- CardContent ---------- */
const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('min-w-0 p-5', className)} data-ui="card-content" data-slot="card-content" {...props} />
  )
);
CardContent.displayName = 'CardContent';

/* ---------- CardFooter ---------- */
const CardFooter = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex min-w-0 flex-wrap items-center gap-2 p-5 pt-0', className)} data-ui="card-footer" data-slot="card-footer" {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

// Backward-compatible default export
export default Card;
