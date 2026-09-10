import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuraThemeProvider } from './AuraThemeProvider';
import { useAuraTheme } from '../../hooks/useAuraTheme';

const ThemeProbe = () => {
  const { theme, toggleTheme } = useAuraTheme();

  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button type="button" onClick={toggleTheme}>Toggle theme</button>
    </div>
  );
};

type TestStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>;

const installTestStorage = (storage: TestStorage) => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
};

const createMemoryStorage = (): TestStorage => {
  let values: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => values[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete values[key];
    }),
    clear: vi.fn(() => {
      values = {};
    }),
  };
};

const setSystemTheme = (matchesDark: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchesDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('AuraThemeProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installTestStorage(createMemoryStorage());
    document.documentElement.classList.remove('light', 'dark');
    setSystemTheme(false);
  });

  it('uses the stored theme and preserves the existing toggle/storage contract', () => {
    window.localStorage.setItem('aura-theme', 'dark');

    render(
      <AuraThemeProvider>
        <ThemeProbe />
      </AuraThemeProvider>,
    );

    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

    expect(screen.getByTestId('theme-value').textContent).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('aura-theme')).toBe('light');
  });

  it('falls back to the system preference when stored data is invalid', () => {
    setSystemTheme(true);
    window.localStorage.setItem('aura-theme', 'system');

    render(
      <AuraThemeProvider>
        <ThemeProbe />
      </AuraThemeProvider>,
    );

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('aura-theme')).toBe('dark');
  });

  it('keeps the session theme usable when browser storage is unavailable', () => {
    installTestStorage({
      getItem: vi.fn(() => {
        throw new Error('storage unavailable');
      }),
      setItem: vi.fn(() => {
        throw new Error('storage unavailable');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    render(
      <AuraThemeProvider>
        <ThemeProbe />
      </AuraThemeProvider>,
    );

    expect(screen.getByTestId('theme-value').textContent).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));

    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
