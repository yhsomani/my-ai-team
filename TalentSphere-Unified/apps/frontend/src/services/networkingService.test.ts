import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/axios';
import { supabase } from '../lib/supabaseClient';
import { networkingService } from './networkingService';

vi.mock('../api/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: mockSupabaseClient,
  typedSupabase: mockSupabaseClient,
}));

describe('networkingService', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('hydrates API-ranked networking suggestions before using the Supabase fallback', async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'user-2',
            full_name: 'Ada Lovelace',
            avatar_url: 'https://example.com/ada.png',
            user_profiles: {
              headline: 'Principal platform engineer',
              current_role: 'Principal Engineer',
              location: 'London',
              skills: [{ name: 'GraphQL' }, { name: 'TypeScript' }],
            },
          },
        ],
        error: null,
      }),
    };

    (apiClient.get as any).mockResolvedValueOnce({
      data: {
        data: [
          {
            suggestedUserId: 'user-2',
            mutualConnections: 2,
            recommendationScore: 60,
            recommendationReasons: ['2 mutual connections', 'Expanded from your accepted network'],
          },
        ],
      },
    });
    (supabase.from as any).mockReturnValue(profileQuery);

    const result = await networkingService.getSuggestions('user-1');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/networking/suggestions/user-1', {
      params: { limit: 20 },
    });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(profileQuery.in).toHaveBeenCalledWith('id', ['user-2']);
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'user-2',
      fullName: 'Ada Lovelace',
      currentRole: 'Principal Engineer',
      mutualConnections: 2,
      recommendationScore: 60,
      recommendationReasons: ['2 mutual connections', 'Expanded from your accepted network'],
      alignment: 60,
    });
  });

  it('falls back to client-ranked Supabase suggestions when the API is unavailable', async () => {
    const connectionsQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        data: [
          { requester_id: 'user-1', receiver_id: 'user-2' },
        ],
        error: null,
      }),
    };
    const currentProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          headline: 'Frontend engineer',
          current_role: 'Frontend Engineer',
          location: 'New York',
          skills: [{ name: 'React' }],
          experiences: [{ company: 'Acme', current: true }],
        },
        error: null,
      }),
    };
    const profilesQuery = {
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'user-3',
            full_name: 'Grace Hopper',
            avatar_url: null,
            user_profiles: {
              headline: 'Frontend engineering leader',
              current_role: 'Frontend Engineer',
              location: 'New York',
              skills: [{ name: 'React' }, { name: 'TypeScript' }],
              experiences: [{ company: 'Acme', current: true }],
            },
          },
        ],
        error: null,
      }),
    };

    (apiClient.get as any).mockRejectedValueOnce(new Error('API unavailable'));
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'connections') return connectionsQuery;
      if (table === 'user_profiles') return currentProfileQuery;
      if (table === 'profiles') return profilesQuery;
      throw new Error(`Unexpected table: ${table}`);
    });
    (supabase.rpc as any).mockResolvedValueOnce({
      data: [{ suggested_user_id: 'user-3', mutual_count: 1 }],
      error: null,
    });

    const result = await networkingService.getSuggestions('user-1');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/networking/suggestions/user-1', {
      params: { limit: 20 },
    });
    expect(connectionsQuery.or).toHaveBeenCalledWith('requester_id.eq.user-1,receiver_id.eq.user-1');
    expect(supabase.rpc).toHaveBeenCalledWith('get_mutual_connection_counts', {
      p_current_user_id: 'user-1',
      p_candidate_ids: ['user-3'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('user-3');
    expect(result[0].fullName).toBe('Grace Hopper');
    expect(result[0].mutualConnections).toBe(1);
    expect(result[0].recommendationReasons).toContain('1 mutual connection');
    expect(result[0].sharedSkills).toEqual(['React']);
    expect(result[0].sharedCompanies).toEqual(['Acme']);
  });
});
