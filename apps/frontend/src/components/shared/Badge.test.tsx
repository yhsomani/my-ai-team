import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('supports compact visible labels with connected accessible descriptions', () => {
    render(
      <Badge
        variant="warning"
        aria-label="Account sync warning"
        description="Changes are saved locally for this session."
      >
        Local
      </Badge>,
    );

    const badge = screen.getByText('Local').closest('span');
    const descriptionId = badge?.getAttribute('aria-describedby');

    expect(badge).toBeTruthy();
    expect(badge?.getAttribute('aria-label')).toBe('Account sync warning');
    expect(badge?.getAttribute('data-ui')).toBe('badge');
    expect(badge?.getAttribute('data-slot')).toBe('badge');
    expect(badge?.getAttribute('data-variant')).toBe('warning');
    expect(badge?.className).toContain('max-w-full');
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId || '')?.textContent).toBe('Changes are saved locally for this session.');
  });

  it('preserves caller descriptions when adding compact-label context', () => {
    render(
      <>
        <span id="external-badge-note">Visible status is source metadata.</span>
        <Badge aria-describedby="external-badge-note" description="Provider is not connected for this account.">
          Demo
        </Badge>
      </>,
    );

    const badge = screen.getByText('Demo').closest('span');
    const describedBy = badge?.getAttribute('aria-describedby')?.split(' ') ?? [];

    expect(badge?.getAttribute('data-ui')).toBe('badge');
    expect(badge?.getAttribute('data-slot')).toBe('badge');
    expect(describedBy).toContain('external-badge-note');
    expect(describedBy.length).toBe(2);
    expect(document.getElementById(describedBy[1])?.textContent).toBe('Provider is not connected for this account.');
  });

  it('preserves caller roles and data attributes without adding implicit status behavior', () => {
    const { container } = render(
      <Badge role="listitem" data-testid="skill-badge" variant="outline">
        React
      </Badge>,
    );

    const badge = screen.getByTestId('skill-badge');
    expect(badge.getAttribute('role')).toBe('listitem');
    expect(badge.getAttribute('data-ui')).toBe('badge');
    expect(badge.getAttribute('data-slot')).toBe('badge');
    expect(badge.getAttribute('data-variant')).toBe('outline');
    expect(badge.textContent).toBe('React');
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
