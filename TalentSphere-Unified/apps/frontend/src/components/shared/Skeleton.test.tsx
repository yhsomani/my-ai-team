import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('hides visual placeholders from assistive technologies by default', () => {
    const { container } = render(<Skeleton className="h-6 w-24" data-testid="decorative-skeleton" />);

    const skeleton = screen.getByTestId('decorative-skeleton');
    expect(skeleton.getAttribute('data-ui')).toBe('skeleton');
    expect(skeleton.getAttribute('data-slot')).toBe('skeleton');
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.className).toContain('motion-safe:animate-pulse');
    expect(container.querySelector('[role]')).toBeNull();
  });

  it('preserves explicit loading semantics when callers provide them', () => {
    render(
      <Skeleton
        role="status"
        aria-label="Loading admin metric"
        className="h-32 w-full"
      />,
    );

    const status = screen.getByRole('status', { name: 'Loading admin metric' });
    expect(status.getAttribute('data-ui')).toBe('skeleton');
    expect(status.getAttribute('data-slot')).toBe('skeleton');
    expect(status.getAttribute('aria-hidden')).toBeNull();
    expect(status.className).toContain('motion-safe:animate-pulse');
  });

  it('keeps caller-provided layout dimensions visible for source guardrails', () => {
    render(<Skeleton className="h-20 min-w-0 w-full" data-testid="sized-skeleton" />);

    const skeleton = screen.getByTestId('sized-skeleton');
    expect(skeleton.getAttribute('data-ui')).toBe('skeleton');
    expect(skeleton.getAttribute('data-slot')).toBe('skeleton');
    expect(skeleton.className).toContain('h-20');
    expect(skeleton.className).toContain('w-full');
  });
});
