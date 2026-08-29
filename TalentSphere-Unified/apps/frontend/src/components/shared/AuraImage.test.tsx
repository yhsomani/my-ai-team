import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuraImage } from './AuraImage';

describe('AuraImage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('preserves caller image props and handlers while applying performance defaults', () => {
    const onLoad = vi.fn();

    render(
      <AuraImage
        src="/images/hiring-workflow.png"
        alt="Hiring workflow"
        className="rounded-lg"
        containerClassName="h-24 w-32"
        onLoad={onLoad}
      />,
    );

    const image = screen.getByRole('img', { name: 'Hiring workflow' });
    const container = image.closest('[data-slot="aura-image"]');

    expect(container?.className).toContain('relative');
    expect(container?.className).toContain('min-w-0');
    expect(container?.className).toContain('h-24');
    expect(container?.getAttribute('data-ui')).toBe('aura-image');
    expect(container?.getAttribute('data-slot')).toBe('aura-image');
    expect(image.getAttribute('data-ui')).toBe('aura-image-media');
    expect(image.getAttribute('data-slot')).toBe('aura-image-media');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('decoding')).toBe('async');
    expect(image.className).toContain('rounded-lg');
    expect(image.className).toContain('opacity-0');

    fireEvent.load(image);

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(image.className).toContain('opacity-100');
  });

  it('marks delayed loading overlays as decorative skeleton presentation', () => {
    vi.useFakeTimers();
    const { container } = render(
      <AuraImage
        src="/images/slow-logo.png"
        alt="Company logo"
        fallbackDelay={250}
      />,
    );

    expect(container.querySelector('[data-ui="aura-image-skeleton"]')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    const skeletonOverlay = container.querySelector('[data-ui="aura-image-skeleton"]');
    expect(skeletonOverlay?.getAttribute('data-slot')).toBe('aura-image-skeleton');
    expect(skeletonOverlay?.getAttribute('aria-hidden')).toBe('true');
    expect(skeletonOverlay?.querySelector('[data-ui="skeleton"]')).toBeTruthy();
  });

  it('uses a named unavailable fallback without swallowing caller error handlers', () => {
    const onError = vi.fn();

    render(
      <AuraImage
        src="/images/missing-profile.png"
        alt="Profile portrait"
        onError={onError}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Profile portrait' }));

    const fallback = screen.getByRole('img', { name: 'Profile portrait image unavailable' });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fallback.getAttribute('data-ui')).toBe('aura-image-fallback');
    expect(fallback.getAttribute('data-slot')).toBe('aura-image-fallback');
    expect(fallback.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(fallback.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(screen.queryByAltText('Profile portrait')).toBeNull();
  });

  it('keeps decorative image fallbacks hidden from assistive technologies', () => {
    const { container } = render(
      <AuraImage
        src="/images/decorative-pattern.png"
        alt=""
        aria-hidden="true"
      />,
    );

    const image = container.querySelector('img');
    expect(image?.getAttribute('alt')).toBe('');

    fireEvent.error(image as HTMLImageElement);

    const fallback = container.querySelector('[data-slot="aura-image-fallback"]');
    expect(fallback?.getAttribute('data-ui')).toBe('aura-image-fallback');
    expect(fallback?.getAttribute('aria-hidden')).toBe('true');
    expect(fallback?.getAttribute('aria-label')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('resets failed state when callers provide a new source', async () => {
    const { rerender } = render(
      <AuraImage src="/images/broken-logo.png" alt="Company logo" />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Company logo' }));
    expect(screen.getByRole('img', { name: 'Company logo image unavailable' })).toBeTruthy();

    rerender(<AuraImage src="/images/updated-logo.png" alt="Company logo" />);

    await waitFor(() => {
      const image = screen.getByRole('img', { name: 'Company logo' });
      expect(image.getAttribute('data-ui')).toBe('aura-image-media');
      expect(image.getAttribute('src')).toBe('/images/updated-logo.png');
    });
  });
});
