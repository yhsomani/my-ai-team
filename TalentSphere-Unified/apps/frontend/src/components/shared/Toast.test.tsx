import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

const ToastHarness = () => {
  const { addToast } = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() => addToast({
          type: 'success',
          title: 'Profile saved',
          message: 'Your profile changes are visible now.',
          duration: 0,
        })}
      >
        Show success
      </button>
      <button
        type="button"
        onClick={() => addToast({
          type: 'error',
          title: 'Save failed',
          message: 'Please try again.',
          duration: 0,
        })}
      >
        Show error
      </button>
      <button
        type="button"
        onClick={() => addToast({
          type: 'info',
          title: 'Draft synced',
          message: 'Account sync finished.',
          duration: 1000,
        })}
      >
        Show timed
      </button>
    </div>
  );
};

const renderToastHarness = () => render(
  <ToastProvider>
    <ToastHarness />
  </ToastProvider>,
);

describe('ToastProvider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('exposes a named notification stack with toast-specific status and dismiss controls', () => {
    renderToastHarness();

    const toastRegion = screen.getByRole('region', { name: 'Toast notifications' });
    expect(toastRegion.getAttribute('data-ui')).toBe('toast-stack');
    expect(toastRegion.getAttribute('data-slot')).toBe('toast-stack');
    fireEvent.click(screen.getByRole('button', { name: 'Show success' }));

    const statusToast = within(toastRegion).getByRole('status', {
      name: 'Success notification: Profile saved',
    });
    expect(statusToast.getAttribute('data-ui')).toBe('toast');
    expect(statusToast.getAttribute('data-slot')).toBe('toast');
    expect(statusToast.getAttribute('data-toast-type')).toBe('success');
    expect(statusToast.querySelector('[data-ui="toast-icon"]')?.getAttribute('data-slot')).toBe('toast-icon');
    expect(statusToast.querySelector('[data-ui="toast-content"]')?.getAttribute('data-slot')).toBe('toast-content');
    expect(statusToast.querySelector('[data-ui="toast-title"]')?.getAttribute('data-slot')).toBe('toast-title');
    expect(statusToast.querySelector('[data-ui="toast-message"]')?.getAttribute('data-slot')).toBe('toast-message');
    expect(within(statusToast).getByText('Profile saved')).toBeTruthy();
    expect(within(statusToast).getByText('Your profile changes are visible now.')).toBeTruthy();

    const dismissButton = within(statusToast).getByRole('button', {
      name: 'Dismiss Profile saved notification',
    });
    expect(dismissButton.getAttribute('data-ui')).toBe('toast-dismiss');
    expect(dismissButton.getAttribute('data-slot')).toBe('toast-dismiss');
    expect(dismissButton.getAttribute('type')).toBe('button');

    fireEvent.click(dismissButton);

    expect(within(toastRegion).queryByRole('status', {
      name: 'Success notification: Profile saved',
    })).toBeNull();
  });

  it('keeps error toasts assertive and preserves automatic dismissal timing', () => {
    vi.useFakeTimers();
    renderToastHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Show error' }));
    const alertToast = screen.getByRole('alert', { name: 'Error notification: Save failed' });
    expect(alertToast.getAttribute('data-ui')).toBe('toast');
    expect(alertToast.getAttribute('data-slot')).toBe('toast');
    expect(alertToast.getAttribute('data-toast-type')).toBe('error');
    expect(alertToast.getAttribute('aria-live')).toBe('assertive');
    expect(alertToast.getAttribute('aria-atomic')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Show timed' }));
    expect(screen.getByRole('status', { name: 'Information notification: Draft synced' })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByRole('status', { name: 'Information notification: Draft synced' })).toBeNull();
    expect(screen.getByRole('alert', { name: 'Error notification: Save failed' })).toBeTruthy();
  });
});
