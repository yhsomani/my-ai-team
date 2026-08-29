import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

const LegacyToastHarness = () => {
  const { showToast } = useToast();

  return (
    <div>
      <button type="button" onClick={() => showToast('info', 'Realtime message received')}>
        Show info
      </button>
      <button type="button" onClick={() => showToast('error', 'Realtime connection failed')}>
        Show error
      </button>
    </div>
  );
};

const renderLegacyToastHarness = () => render(
  <ToastProvider>
    <LegacyToastHarness />
  </ToastProvider>,
);

describe('legacy ToastContext compatibility provider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('exposes realtime toasts through a named region with specific dismiss controls', () => {
    renderLegacyToastHarness();

    const toastRegion = screen.getByRole('region', { name: 'Realtime toast notifications' });
    fireEvent.click(screen.getByRole('button', { name: 'Show info' }));

    const infoToast = within(toastRegion).getByRole('status', {
      name: 'Information notification: Realtime message received',
    });
    expect(within(infoToast).getByText('Realtime message received')).toBeTruthy();

    fireEvent.click(within(infoToast).getByRole('button', {
      name: 'Dismiss Realtime message received notification',
    }));

    expect(within(toastRegion).queryByRole('status', {
      name: 'Information notification: Realtime message received',
    })).toBeNull();
  });

  it('keeps click-to-dismiss and auto-dismiss behavior for compatibility', () => {
    vi.useFakeTimers();
    renderLegacyToastHarness();

    fireEvent.click(screen.getByRole('button', { name: 'Show error' }));
    const errorToast = screen.getByRole('alert', {
      name: 'Error notification: Realtime connection failed',
    });
    expect(errorToast.getAttribute('aria-live')).toBe('assertive');
    expect(errorToast.getAttribute('aria-atomic')).toBe('true');

    fireEvent.click(errorToast);
    expect(screen.queryByRole('alert', {
      name: 'Error notification: Realtime connection failed',
    })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show info' }));
    expect(screen.getByRole('status', {
      name: 'Information notification: Realtime message received',
    })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByRole('status', {
      name: 'Information notification: Realtime message received',
    })).toBeNull();
  });
});
