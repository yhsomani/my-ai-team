import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { apiClient, setupInterceptors } from './axios';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('apiClient interceptors', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const store = {
    dispatch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.defaults.adapter = (async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => ({
      data: {
        authorization: config.headers.Authorization,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })) as AxiosAdapter;
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('attaches the current Supabase access token to API requests', async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'session-token-123',
        },
      },
    });

    setupInterceptors(store as any);

    const response = await apiClient.get('/api/v1/jobs');

    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    expect(response.data.authorization).toBe('Bearer session-token-123');
  });

  it('does not register duplicate request interceptors when setup runs again', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          access_token: 'latest-token',
        },
      },
    });

    setupInterceptors(store as any);
    setupInterceptors(store as any);

    const response = await apiClient.get('/api/v1/jobs');

    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    expect(response.data.authorization).toBe('Bearer latest-token');
  });

  it('leaves Authorization unset when there is no active Supabase session', async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    setupInterceptors(store as any);

    const response = await apiClient.get('/api/v1/jobs');

    expect(response.data.authorization).toBeUndefined();
  });
});
