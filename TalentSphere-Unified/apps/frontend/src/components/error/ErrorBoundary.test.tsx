import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowingChild = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('renders safe application recovery copy without exposing raw error messages', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Database password leaked in stack trace" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy();
    expect(screen.getByText('Application recovery')).toBeTruthy();
    expect(screen.getByText(/Internal error messages are not shown here/)).toBeTruthy();
    expect(screen.queryByText(/Database password leaked/i)).toBeNull();
  });

  it('uses service-unavailable recovery copy for network and service failures', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Network error: failed to fetch profile data" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Service unavailable' })).toBeTruthy();
    expect(screen.getByText(/A required service did not respond/)).toBeTruthy();
    expect(screen.queryByText(/failed to fetch profile data/i)).toBeNull();
  });

  it('preserves custom fallback rendering', () => {
    render(
      <ErrorBoundary fallback={<div role="alert">Custom fallback</div>}>
        <ThrowingChild message="Boom" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert').textContent).toBe('Custom fallback');
    expect(screen.queryByRole('heading', { name: /Something went wrong|Service unavailable/ })).toBeNull();
  });

  it('keeps the reload recovery action', () => {
    const onRetry = vi.fn();

    render(
      <ErrorBoundary onRetry={onRetry}>
        <ThrowingChild message="502 gateway timeout" />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
