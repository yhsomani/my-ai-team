import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;
type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;
type LabelProps = React.HTMLAttributes<HTMLSpanElement>;

export const DisplayLG: React.FC<HeadingProps> = ({ children, className, ...props }) => (
  <h1 className={cn('max-w-full break-words text-3xl font-semibold leading-tight text-[var(--text-primary)]', className)} {...props}>
    {children}
  </h1>
);

export const HeadlineMD: React.FC<HeadingProps> = ({ children, className, ...props }) => (
  <h2 className={cn('max-w-full break-words text-base font-semibold leading-tight text-[var(--text-primary)]', className)} {...props}>
    {children}
  </h2>
);

export const BodyMD: React.FC<ParagraphProps> = ({ children, className, ...props }) => (
  <p className={cn('max-w-full break-words text-sm leading-6 text-[var(--text-secondary)]', className)} {...props}>
    {children}
  </p>
);

export const LabelSM: React.FC<LabelProps> = ({ children, className, ...props }) => (
  <span className={cn('max-w-full break-words text-xs font-medium uppercase text-[var(--text-muted)]', className)} {...props}>
    {children}
  </span>
);
