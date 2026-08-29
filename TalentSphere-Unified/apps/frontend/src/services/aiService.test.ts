import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/axios';
import { typedSupabase } from '../lib/supabaseClient';
import { aiService, estimateExperienceYears, extractSkillsFromText } from './aiService';

vi.mock('../api/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../lib/supabaseClient', () => {
  const typedClient = {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  };
  const compatibilityClient = {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  };

  return {
    supabase: compatibilityClient,
    typedSupabase: typedClient,
  };
});

describe('aiService typed persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts known skills from resume text case-insensitively', () => {
    const skills = extractSkillsFromText(
      'I am a full stack developer with 5 years of experience in JavaScript, React, Node.js, SQL, and Docker.',
    );

    expect(skills).toContain('javascript');
    expect(skills).toContain('react');
    expect(skills).toContain('node');
    expect(skills).toContain('sql');
    expect(skills).toContain('docker');
    expect(skills).not.toContain('python');
    expect(extractSkillsFromText('PYTHON and JAVA developer')).toEqual(expect.arrayContaining(['python', 'java']));
  });

  it('estimates experience years from common resume phrasing', () => {
    expect(estimateExperienceYears('I have 5 years of experience')).toBe(5);
    expect(estimateExperienceYears('10+ years in the industry')).toBe(10);
    expect(estimateExperienceYears('No experience mentioned')).toBe(0);
  });

  it('routes resume analysis through the backend AI API', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        data: '{"summary":"Backend analysis","skills":["TypeScript"],"suggestedJobs":["Frontend Engineer"]}',
      },
    });

    const result = await aiService.analyzeResume('TypeScript resume text');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/ai/analyze-resume',
      'TypeScript resume text',
      {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 10000,
      },
    );
    expect(result).toEqual({
      summary: 'Backend analysis',
      skills: ['TypeScript'],
      suggestedJobs: ['Frontend Engineer'],
      isFallback: false,
    });
  });

  it('uses explicit client heuristics when resume analysis API is unavailable', async () => {
    (apiClient.post as any).mockRejectedValueOnce(new Error('API unavailable'));

    const result = await aiService.analyzeResume('Experienced developer with 4 years in TypeScript and Python.');

    expect(result).toEqual({
      skills: ['typescript', 'python'],
      experience_years: 4,
      isFallback: true,
    });
  });

  it('routes AI generation calls through the backend AI API', async () => {
    (apiClient.post as any)
      .mockResolvedValueOnce({
        data: { data: '{"matchScore":0.91,"reasoning":"Strong skill overlap."}' },
      })
      .mockResolvedValueOnce({
        data: { data: { message: 'Draft a concise follow-up.' } },
      });
    (apiClient.get as any).mockResolvedValueOnce({
      data: { data: { recommendedPath: 'Developer -> Architect' } },
    });

    await expect(aiService.getMatchScore('resume text', 'job description')).resolves.toEqual({
      matchScore: 0.91,
      reasoning: 'Strong skill overlap.',
    });
    await expect(aiService.generateCareerPath('user-1')).resolves.toEqual({ recommendedPath: 'Developer -> Architect' });
    await expect(aiService.getChatResponse('Help me follow up')).resolves.toMatchObject({
      message: 'Draft a concise follow-up.',
      provenanceMode: 'heuristic',
      sourceLabel: 'Heuristic AI guidance',
      providerBacked: false,
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/v1/ai/match-job', null, {
      params: { resumeText: 'resume text', jobDescription: 'job description' },
      timeout: 10000,
    });
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/ai/career-path/user-1', {
      timeout: 10000,
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/v1/ai/chat', { prompt: 'Help me follow up' }, {
      timeout: 10000,
    });
  });

  it('upserts AI chat sessions through the generated ai_sessions table', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'session-1',
        user_id: 'user-1',
        title: 'Interview prep',
        messages: [{ id: 'message-1', role: 'assistant', content: 'Draft a plan.' }],
        last_saved_at: '2026-06-27T10:00:00.000Z',
        created_at: '2026-06-27T09:00:00.000Z',
        updated_at: '2026-06-27T10:00:00.000Z',
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select });
    (typedSupabase.from as any).mockReturnValue({ upsert });

    const session = await aiService.saveSession('user-1', {
      id: 'session-1',
      title: 'Interview prep',
      messages: [{ id: 'message-1', role: 'assistant', content: 'Draft a plan.' }],
      lastSavedAt: '2026-06-27T10:00:00.000Z',
    });

    expect(typedSupabase.from).toHaveBeenCalledWith('ai_sessions');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'session-1',
      user_id: 'user-1',
      title: 'Interview prep',
      last_saved_at: '2026-06-27T10:00:00.000Z',
    }), { onConflict: 'id' });
    expect(session).toMatchObject({
      id: 'session-1',
      userId: 'user-1',
      messages: [{ id: 'message-1', role: 'assistant', content: 'Draft a plan.' }],
    });
  });

  it('persists automation suggestions through the generated automation_suggestions table', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'suggestion-1',
        user_id: 'user-1',
        session_id: 'session-1',
        suggestion_type: 'chat_response',
        source_label: 'AI assistant',
        source_detail: 'Generated from chat.',
        prompt: 'Help me follow up.',
        content: 'Send a concise follow-up.',
        review_status: 'draft',
        reviewed_at: null,
        metadata: {},
        created_at: '2026-06-27T09:00:00.000Z',
        updated_at: '2026-06-27T09:00:00.000Z',
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select });
    (typedSupabase.from as any).mockReturnValue({ upsert });

    const suggestion = await aiService.saveAutomationSuggestion('user-1', {
      id: 'suggestion-1',
      sessionId: 'session-1',
      sourceLabel: 'AI assistant',
      sourceDetail: 'Generated from chat.',
      prompt: 'Help me follow up.',
      content: 'Send a concise follow-up.',
    });

    expect(typedSupabase.from).toHaveBeenCalledWith('automation_suggestions');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'suggestion-1',
      user_id: 'user-1',
      session_id: 'session-1',
      suggestion_type: 'chat_response',
      review_status: 'draft',
    }), { onConflict: 'id' });
    expect(suggestion).toMatchObject({
      id: 'suggestion-1',
      reviewStatus: 'draft',
      sourceLabel: 'AI assistant',
    });
  });

  it('updates suggestion review status with a typed update payload', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'suggestion-1',
        user_id: 'user-1',
        session_id: 'session-1',
        suggestion_type: 'chat_response',
        source_label: null,
        source_detail: null,
        prompt: null,
        content: 'Save this.',
        review_status: 'saved',
        reviewed_at: '2026-06-27T11:00:00.000Z',
        metadata: {},
        created_at: '2026-06-27T09:00:00.000Z',
        updated_at: '2026-06-27T11:00:00.000Z',
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eqId = vi.fn().mockReturnValue({ select });
    const eqUser = vi.fn().mockReturnValue({ eq: eqId });
    const update = vi.fn().mockReturnValue({ eq: eqUser });
    (typedSupabase.from as any).mockReturnValue({ update });

    const suggestion = await aiService.updateAutomationSuggestionStatus(
      'user-1',
      'suggestion-1',
      'saved',
      '2026-06-27T11:00:00.000Z',
    );

    expect(update).toHaveBeenCalledWith({
      review_status: 'saved',
      reviewed_at: '2026-06-27T11:00:00.000Z',
    });
    expect(eqUser).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eqId).toHaveBeenCalledWith('id', 'suggestion-1');
    expect(suggestion.reviewStatus).toBe('saved');
  });

  it('uses typed count queries for platform insights', async () => {
    const profileSelect = vi.fn().mockResolvedValue({ count: 12 });
    const jobEq = vi.fn().mockResolvedValue({ count: 5 });
    const courseEq = vi.fn().mockResolvedValue({ count: 3 });
    const jobSelect = vi.fn().mockReturnValue({ eq: jobEq });
    const courseSelect = vi.fn().mockReturnValue({ eq: courseEq });

    (typedSupabase.from as any).mockImplementation((table: string) => {
      if (table === 'profiles') return { select: profileSelect };
      if (table === 'jobs') return { select: jobSelect };
      if (table === 'courses') return { select: courseSelect };
      throw new Error(`Unexpected table ${table}`);
    });

    const insights = await aiService.getInsights();

    expect(typedSupabase.from).toHaveBeenCalledWith('profiles');
    expect(typedSupabase.from).toHaveBeenCalledWith('jobs');
    expect(typedSupabase.from).toHaveBeenCalledWith('courses');
    expect(jobEq).toHaveBeenCalledWith('status', 'PUBLISHED');
    expect(courseEq).toHaveBeenCalledWith('is_published', true);
    expect(insights.insight).toContain('12+ professionals');
    expect(insights.insight).toContain('5+ job opportunities');
    expect(insights.insight).toContain('3+ courses');
  });
});
