import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('binds visible label and description to the switch control', () => {
    const onChange = vi.fn();
    render(
      <Toggle
        checked={false}
        onChange={onChange}
        label="Email notifications"
        description="Receive account updates by email."
      />,
    );

    const toggle = screen.getByRole('switch', { name: 'Email notifications' });
    const descriptionId = toggle.getAttribute('aria-describedby');

    const root = toggle.closest('[data-ui="toggle"]');
    expect(root?.getAttribute('data-slot')).toBe('toggle');
    expect(toggle.getAttribute('data-ui')).toBe('toggle-switch');
    expect(toggle.getAttribute('data-slot')).toBe('toggle-switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId || '')?.textContent).toBe('Receive account updates by email.');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('keeps unlabeled switches named and prevents disabled changes', () => {
    const onChange = vi.fn();
    render(
      <Toggle
        checked
        onChange={onChange}
        ariaLabel="Enable beta features"
        disabled
      />,
    );

    const toggle = screen.getByRole('switch', { name: 'Enable beta features' });
    expect(toggle.closest('[data-ui="toggle"]')?.getAttribute('data-slot')).toBe('toggle');
    expect(toggle.getAttribute('data-ui')).toBe('toggle-switch');
    expect(toggle.getAttribute('data-slot')).toBe('toggle-switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.getAttribute('disabled')).not.toBeNull();

    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not submit parent forms when toggled', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Toggle
          checked={false}
          onChange={onChange}
          label="Product updates"
          description="Receive product announcements."
        />
      </form>,
    );

    const toggle = screen.getByRole('switch', { name: 'Product updates' });
    fireEvent.click(toggle);

    expect(toggle.closest('[data-ui="toggle"]')?.getAttribute('data-slot')).toBe('toggle');
    expect(toggle.getAttribute('data-slot')).toBe('toggle-switch');
    expect(toggle.getAttribute('type')).toBe('button');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
