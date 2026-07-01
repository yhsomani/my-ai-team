import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getSourceStatusDefaults, SourceStatusBadge } from './SourceStatusBadge';

describe('SourceStatusBadge', () => {
  it('renders default source copy with accessible description metadata', () => {
    render(<SourceStatusBadge status="local" />);

    const badge = screen.getByText('Saved locally').closest('span[data-ui="source-status-badge"]');
    const descriptionId = badge?.getAttribute('aria-describedby');

    expect(badge).toBeTruthy();
    expect(badge?.getAttribute('data-source-status')).toBe('local');
    expect(badge?.getAttribute('data-variant')).toBe('warning');
    expect(badge?.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId || '')?.textContent).toBe(
      getSourceStatusDefaults('local').description,
    );
  });

  it('supports caller-owned labels and descriptions without changing source classification', () => {
    render(
      <SourceStatusBadge
        status="demo"
        label="Requests only"
        description="Provider webhooks do not own this state yet."
      />,
    );

    const badge = screen.getByText('Requests only').closest('span[data-ui="source-status-badge"]');
    const descriptionId = badge?.getAttribute('aria-describedby');

    expect(badge?.getAttribute('data-source-status')).toBe('demo');
    expect(badge?.getAttribute('data-variant')).toBe('warning');
    expect(document.getElementById(descriptionId || '')?.textContent).toBe(
      'Provider webhooks do not own this state yet.',
    );
  });

  it('exposes heuristic source status without implying provider-backed output', () => {
    render(<SourceStatusBadge status="heuristic" label="Heuristic AI guidance" />);

    const badge = screen.getByText('Heuristic AI guidance').closest('span[data-ui="source-status-badge"]');
    const descriptionId = badge?.getAttribute('aria-describedby');

    expect(badge?.getAttribute('data-source-status')).toBe('heuristic');
    expect(badge?.getAttribute('data-variant')).toBe('default');
    expect(document.getElementById(descriptionId || '')?.textContent).toBe(
      getSourceStatusDefaults('heuristic').description,
    );
  });
});
