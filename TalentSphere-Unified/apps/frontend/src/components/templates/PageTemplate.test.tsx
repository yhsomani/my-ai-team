import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageTemplate } from './PageTemplate';

describe('PageTemplate', () => {
  it('renders the shared page header and a named content landmark', () => {
    render(
      <PageTemplate
        title="Operations"
        subtitle="Review source health"
        actions={<button type="button">Refresh</button>}
        className="custom-shell"
        contentClassName="custom-content"
      >
        <section>Operational content</section>
      </PageTemplate>,
    );

    const shell = screen.getByRole('banner', { name: 'Operations' }).parentElement;
    const main = screen.getByRole('main', { name: 'Operations content' });

    expect(shell?.getAttribute('data-ui')).toBe('page-template');
    expect(shell?.getAttribute('data-slot')).toBe('page-template');
    expect(shell?.className).toContain('custom-shell');
    expect(screen.getByRole('heading', { level: 1, name: 'Operations' })).toBeTruthy();
    expect(screen.getByText('Review source health')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Operations actions' }).contains(screen.getByRole('button', { name: 'Refresh' }))).toBe(true);
    expect(main.getAttribute('data-ui')).toBe('page-template-content');
    expect(main.getAttribute('data-slot')).toBe('page-template-content');
    expect(main.className).toContain('custom-content');
    expect(main.textContent).toContain('Operational content');
  });

  it('can hide the header while preserving a caller-owned main label', () => {
    render(
      <PageTemplate title="Hidden title" showHeader={false} mainAriaLabel="Utility content">
        Utility body
      </PageTemplate>,
    );

    expect(screen.queryByRole('banner')).toBeNull();
    const main = screen.getByRole('main', { name: 'Utility content' });
    expect(main.getAttribute('data-ui')).toBe('page-template-content');
    expect(main.getAttribute('data-slot')).toBe('page-template-content');
    expect(main.textContent).toBe('Utility body');
  });
});
