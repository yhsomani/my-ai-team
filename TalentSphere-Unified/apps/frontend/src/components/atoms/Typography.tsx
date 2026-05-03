import React from 'react';

interface TextProps {
  children: React.ReactNode;
  className?: string;
}

export const DisplayLG: React.FC<TextProps> = ({ children, className = '' }) => (
  <h1 className={`text-display-lg font-bold tracking-tight text-on-surface ${className}`} style={{ fontSize: 'var(--display-lg)', letterSpacing: '-0.02em' }}>
    {children}
  </h1>
);

export const HeadlineMD: React.FC<TextProps> = ({ children, className = '' }) => (
  <h2 className={`text-headline-md font-semibold text-on-surface ${className}`} style={{ fontSize: 'var(--headline-md)', letterSpacing: '-0.02em' }}>
    {children}
  </h2>
);

export const BodyMD: React.FC<TextProps> = ({ children, className = '' }) => (
  <p className={`text-body-md text-on-surface-variant ${className}`} style={{ fontSize: 'var(--body-md)' }}>
    {children}
  </p>
);

export const LabelSM: React.FC<TextProps> = ({ children, className = '' }) => (
  <span className={`text-label-sm font-semibold uppercase tracking-wider text-primary-indigo ${className}`} style={{ fontSize: 'var(--label-sm)' }}>
    {children}
  </span>
);
