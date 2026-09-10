import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';
import { Button } from './AuraButton';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('binds the page title and description to the header landmark', () => {
    const { container } = render(
      <PageHeader
        title="Jobs"
        description="Discover roles, review saved searches, and track applications."
        badge={<Badge variant="outline">Explore</Badge>}
      />,
    );

    const header = container.querySelector('header');
    const title = screen.getByRole('heading', { level: 1, name: 'Jobs' });
    const descriptionId = header?.getAttribute('aria-describedby');

    expect(header?.getAttribute('data-ui')).toBe('page-header');
    expect(header?.getAttribute('data-slot')).toBe('page-header');
    expect(header?.getAttribute('aria-labelledby')).toBe(title.id);
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId || '')?.textContent).toBe(
      'Discover roles, review saved searches, and track applications.',
    );
    expect(container.querySelector('[data-ui="page-header-copy"]')?.getAttribute('data-slot')).toBe('page-header-copy');
    expect(container.querySelector('[data-ui="page-header-title-row"]')?.getAttribute('data-slot')).toBe('page-header-title-row');
    expect(screen.getByText('Explore')).toBeTruthy();
  });

  it('names action groups without changing caller-owned controls', () => {
    render(
      <PageHeader
        title="Billing"
        actions={
          <>
            <Button variant="outline">Update Payment Method</Button>
            <Button>Review Plan</Button>
          </>
        }
      />,
    );

    const actionGroup = screen.getByRole('group', { name: 'Billing actions' });

    expect(actionGroup.getAttribute('data-ui')).toBe('page-header-actions');
    expect(actionGroup.getAttribute('data-slot')).toBe('page-header-actions');
    expect(within(actionGroup).getByRole('button', { name: 'Update Payment Method' })).toBeTruthy();
    expect(within(actionGroup).getByRole('button', { name: 'Review Plan' })).toBeTruthy();
  });
});
