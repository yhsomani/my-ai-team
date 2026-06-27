import React from 'react';

interface TextProps {
  children: React.ReactNode;
  className?: string;
}

export const DisplayLG: React.FC<TextProps> = ({ children, className = '' }) => (
  <h1 className={`text-3xl font-semibold leading-tight text-[var(--text-primary)] ${className}`}>
    {children}
  </h1>
);

export const HeadlineMD: React.FC<TextProps> = ({ children, className = '' }) => (
  <h2 className={`text-base font-semibold leading-tight text-[var(--text-primary)] ${className}`}>
    {children}
  </h2>
);

export const BodyMD: React.FC<TextProps> = ({ children, className = '' }) => (
  <p className={`text-sm leading-6 text-[var(--text-secondary)] ${className}`}>
    {children}
  </p>
);

export const LabelSM: React.FC<TextProps> = ({ children, className = '' }) => (
  <span className={`text-xs font-medium uppercase text-[var(--text-muted)] ${className}`}>
    {children}
  </span>
);
