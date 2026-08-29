import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('exposes a named section with connected description and decorative icon', () => {
    render(
      <EmptyState
        title="No saved searches"
        description="Save a search to rerun it later."
      />,
    );

    const emptyState = screen.getByRole('region', { name: 'No saved searches' });
    const descriptionId = emptyState.getAttribute('aria-describedby');

    expect(emptyState.getAttribute('data-ui')).toBe('empty-state');
    expect(emptyState.getAttribute('data-slot')).toBe('empty-state');
    expect(emptyState.querySelector('[data-ui="empty-state-icon"]')?.getAttribute('data-slot')).toBe('empty-state-icon');
    expect(emptyState.querySelector('[data-ui="empty-state-title"]')?.getAttribute('data-slot')).toBe('empty-state-title');
    expect(emptyState.querySelector('[data-ui="empty-state-description"]')?.getAttribute('data-slot')).toBe('empty-state-description');
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId || '')?.textContent).toBe('Save a search to rerun it later.');
    expect(within(emptyState).getByText('No saved searches')).toBeTruthy();
    expect(emptyState.querySelector('[aria-hidden="true"] svg')).toBeTruthy();
  });

  it('preserves caller-provided recovery actions without changing action behavior', () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <EmptyState
          title="No courses found"
          description="Try adjusting your filters."
          action={{ label: 'Reset Filters', onClick }}
        />
      </form>,
    );

    const emptyState = screen.getByRole('region', { name: 'No courses found' });
    const action = within(emptyState).getByRole('button', { name: 'Reset Filters' });
    const actionArea = emptyState.querySelector('[data-ui="empty-state-action"]');
    fireEvent.click(action);

    expect(actionArea?.getAttribute('data-slot')).toBe('empty-state-action');
    expect(action.getAttribute('type')).toBe('button');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
