import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './AuraInput';

describe('Input', () => {
  it('connects visible labels and helper text without marking valid fields invalid', () => {
    render(
      <Input
        label="Email"
        type="email"
        required
        helperText="Use your work email address."
        icon={<svg data-testid="input-icon" />}
      />,
    );

    const input = screen.getByLabelText('Email');
    const helperId = input.getAttribute('aria-describedby');
    const field = input.closest('[data-ui="input-field"]');

    expect(field?.getAttribute('data-slot')).toBe('input-field');
    expect(input.getAttribute('data-ui')).toBe('input');
    expect(input.getAttribute('data-slot')).toBe('input');
    expect(field?.querySelector('[data-ui="input-label-row"]')?.getAttribute('data-slot')).toBe('input-label-row');
    expect(field?.querySelector('[data-ui="input-label"]')?.getAttribute('data-slot')).toBe('input-label');
    expect(field?.querySelector('[data-ui="input-label"]')?.textContent).toBe('Email');
    expect(field?.querySelector('[data-ui="input-required-marker"]')?.getAttribute('data-slot')).toBe('input-required-marker');
    expect(field?.querySelector('[data-ui="input-required-marker"]')?.textContent).toBe('*');
    expect(field?.querySelector('[data-ui="input-control"]')?.getAttribute('data-slot')).toBe('input-control');
    expect(field?.querySelector('[data-ui="input-helper"]')?.getAttribute('data-slot')).toBe('input-helper');
    expect(field?.querySelector('[data-ui="input-helper"]')?.textContent).toBe('Use your work email address.');
    expect(input.getAttribute('required')).not.toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(helperId).toBeTruthy();
    expect(document.getElementById(helperId || '')?.textContent).toBe('Use your work email address.');
    expect(screen.getByTestId('input-icon').parentElement?.getAttribute('data-ui')).toBe('input-icon');
    expect(screen.getByTestId('input-icon').parentElement?.getAttribute('data-slot')).toBe('input-icon');
    expect(screen.getByTestId('input-icon').parentElement?.getAttribute('aria-hidden')).toBe('true');
  });

  it('connects error text and preserves caller-provided descriptions', () => {
    render(
      <>
        <p id="external-password-hint">At least 8 characters.</p>
        <Input
          label="Password"
          type="password"
          helperText="This helper is hidden while the error is active."
          error="Password is required."
          aria-describedby="external-password-hint"
        />
      </>,
    );

    const input = screen.getByLabelText('Password');
    const describedBy = input.getAttribute('aria-describedby') || '';
    const errorMessageId = input.getAttribute('aria-errormessage');
    const field = input.closest('[data-ui="input-field"]');

    expect(field?.getAttribute('data-slot')).toBe('input-field');
    expect(input.getAttribute('data-ui')).toBe('input');
    expect(input.getAttribute('data-slot')).toBe('input');
    expect(field?.querySelector('[data-ui="input-error"]')?.getAttribute('data-slot')).toBe('input-error');
    expect(field?.querySelector('[data-ui="input-error"]')?.textContent).toBe('Password is required.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(describedBy).toContain('external-password-hint');
    expect(errorMessageId).toBeTruthy();
    expect(describedBy).toContain(errorMessageId || '');
    expect(document.getElementById(errorMessageId || '')?.textContent).toBe('Password is required.');
    expect(screen.queryByText('This helper is hidden while the error is active.')).toBeNull();
  });
});
