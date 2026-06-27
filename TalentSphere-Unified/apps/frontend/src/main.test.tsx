import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const render = vi.fn();
  const createRoot = vi.fn(() => ({ render }));
  const setupInterceptors = vi.fn();
  const store = {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  };

  return {
    createRoot,
    render,
    setupInterceptors,
    store,
  };
});

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mocks.createRoot,
  },
}));

vi.mock('react-redux', () => ({
  Provider: ({ children }: { children: unknown }) => children,
}));

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: unknown }) => children,
}));

vi.mock('./components/shared/AuraThemeProvider', () => ({
  AuraThemeProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock('./App.tsx', () => ({
  default: () => null,
}));

vi.mock('./store', () => ({
  store: mocks.store,
}));

vi.mock('./api/axios', () => ({
  setupInterceptors: mocks.setupInterceptors,
}));

describe('main bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('installs API interceptors with the application store before rendering', async () => {
    await import('./main');

    expect(mocks.setupInterceptors).toHaveBeenCalledTimes(1);
    expect(mocks.setupInterceptors).toHaveBeenCalledWith(mocks.store);
    expect(mocks.createRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(mocks.render).toHaveBeenCalledTimes(1);
  });
});
