import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './AuraButton';

describe('Button', () => {
  it('keeps loading buttons inert while preserving the visible action label', () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Save Preferences
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save Preferences' });

    expect(button.getAttribute('disabled')).not.toBeNull();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('data-ui')).toBe('button');
    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.getAttribute('data-loading')).toBe('true');
    expect(button.getAttribute('data-variant')).toBe('default');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.querySelector('svg')?.getAttribute('focusable')).toBe('false');

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses wrapping-safe sizing for long labels without changing caller props', () => {
    render(
      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-label="Review application submission with a long action label"
      >
        Review application submission with a long action label
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Review application submission with a long action label' });

    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('data-ui')).toBe('button');
    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.getAttribute('data-variant')).toBe('outline');
    expect(button.getAttribute('data-size')).toBe('lg');
    expect(button.className).toContain('max-w-full');
    expect(button.className).toContain('whitespace-normal');
    expect(button.className).toContain('min-h-11');
  });

  it('preserves caller-owned submit type for form actions', () => {
    render(
      <form>
        <Button type="submit" variant="default">
          Submit application
        </Button>
      </form>,
    );

    const button = screen.getByRole('button', { name: 'Submit application' });

    expect(button.getAttribute('type')).toBe('submit');
    expect(button.getAttribute('data-ui')).toBe('button');
    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.getAttribute('data-variant')).toBe('default');
  });

  it('keeps icon buttons dimensionally stable and named by caller labels', () => {
    render(
      <Button size="icon" variant="ghost" aria-label="Close modal">
        <span aria-hidden="true">x</span>
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Close modal' });

    expect(button.getAttribute('data-ui')).toBe('button');
    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.getAttribute('data-size')).toBe('icon');
    expect(button.className).toContain('h-9');
    expect(button.className).toContain('w-9');
    expect(button.className).toContain('p-0');
  });
});
