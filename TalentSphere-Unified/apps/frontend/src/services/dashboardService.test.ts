import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import { dashboardService } from './dashboardService';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const createBuilder = (response: Record<string, unknown>) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
    then: (resolve: (value: Record<string, unknown>) => unknown) => Promise.resolve(response).then(resolve),
  };

  return builder;
};

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes the current user from unread message counts', async () => {
    const builders: Record<string, any> = {
      leaderboard: createBuilder({ data: { total_xp: 250 }, error: null }),
      job_applications: createBuilder({ count: 1, error: null }),
      jobs: createBuilder({ data: [], error: null }),
      challenges: createBuilder({ data: [], error: null }),
      conversation_participants: createBuilder({
        data: [
          { conversation_id: 'conv-1' },
          { conversation_id: 'conv-2' },
        ],
        error: null,
      }),
      messages: createBuilder({ count: 2, error: null }),
      user_profiles: createBuilder({
        data: {
          headline: 'Frontend Engineer',
          skills: [{ name: 'React' }],
        },
        error: null,
      }),
      saved_job_searches: createBuilder({ count: 0, error: null }),
      enrollments: createBuilder({ count: 0, error: null }),
      challenge_submissions: createBuilder({ count: 0, error: null }),
    };

    (supabase.from as any).mockImplementation((table: string) => builders[table]);

    const result = await dashboardService.fetchDashboardData('user-1');

    expect(builders.messages.in).toHaveBeenCalledWith('conversation_id', ['conv-1', 'conv-2']);
    expect(builders.messages.neq).toHaveBeenCalledWith('sender_id', 'user-1');
    expect(builders.messages.is).toHaveBeenCalledWith('read_at', null);
    expect(result.stats.messages).toBe(2);
    expect(result.stats.msgTrend).toBe('NEW');
  });
});
