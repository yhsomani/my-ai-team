import { beforeEach, describe, expect, it, vi } from 'vitest';
import { challengeService } from './challengeService';
import { typedSupabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => {
  const client = {
    from: vi.fn(),
  };

  return {
    supabase: client,
    typedSupabase: client,
  };
});

describe('challengeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries published challenges through the generated schema field and maps UI fields', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{
        id: 'challenge-1',
        title: 'Array Sum',
        description: 'Return the sum.',
        category: 'FRONTEND',
        difficulty: 'EASY',
        xp_reward: 25,
        starter_code: 'function sum() {}',
        test_cases: [{ input: '[1,2]', expectedOutput: '3' }],
        solution_template: null,
        time_limit_minutes: 30,
        is_published: true,
        created_by: 'admin-1',
        created_at: '2026-06-27T00:00:00Z',
        updated_at: '2026-06-27T00:00:00Z',
      }],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ eq });
    const select = vi.fn().mockReturnValue({ order });
    (typedSupabase.from as any).mockReturnValue({ select });

    const challenges = await challengeService.getChallenges(true);

    expect(typedSupabase.from).toHaveBeenCalledWith('challenges');
    expect(eq).toHaveBeenCalledWith('is_published', true);
    expect(challenges[0]).toMatchObject({
      id: 'challenge-1',
      xpReward: 25,
      xp_reward: 25,
      starterCode: 'function sum() {}',
      is_active: true,
      status: 'OPEN',
    });
    expect(challenges[0].testCases?.[0]).toMatchObject({ input: '[1,2]' });
  });

  it('inserts challenge submissions using canonical database columns', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'submission-1',
        challenge_id: 'challenge-1',
        user_id: 'user-1',
        code_submitted: 'return 3;',
        language: 'typescript',
        passed_tests: null,
        score: null,
        execution_time_ms: null,
        memory_used_kb: null,
        feedback: null,
        submitted_at: '2026-06-27T00:00:00Z',
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    (typedSupabase.from as any).mockReturnValue({ insert });

    const submission = await challengeService.submitChallengeSolution(
      'challenge-1',
      'user-1',
      'typescript',
      'return 3;',
    );

    expect(typedSupabase.from).toHaveBeenCalledWith('challenge_submissions');
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({
      challenge_id: 'challenge-1',
      user_id: 'user-1',
      language: 'typescript',
      code_submitted: 'return 3;',
    })]);
    expect(insert).not.toHaveBeenCalledWith([expect.objectContaining({
      code: expect.anything(),
      status: expect.anything(),
    })]);
    expect(submission).toMatchObject({
      id: 'submission-1',
      code: 'return 3;',
      status: 'SUBMITTED',
    });
  });
});
