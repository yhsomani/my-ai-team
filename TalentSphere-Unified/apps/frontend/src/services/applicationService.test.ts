import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import { applicationService } from './applicationService';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('applicationService draft history', () => {
  let queryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            user_id: 'user-1',
            job_id: 'job-1',
            resume_url: 'https://example.test/resume.pdf',
            cover_letter: 'Hello',
            source: 'ai',
            reason: 'ai_applied',
            created_at: '2026-06-26T10:00:00.000Z',
            updated_at: '2026-06-26T10:01:00.000Z',
          },
        ],
        error: null,
      }),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: '22222222-2222-4222-8222-222222222222',
          user_id: 'user-1',
          job_id: 'job-1',
          resume_url: '',
          cover_letter: 'Manual draft',
          source: 'manual',
          reason: 'autosave',
          created_at: '2026-06-26T10:00:00.000Z',
          updated_at: '2026-06-26T10:00:30.000Z',
        },
        error: null,
      }),
    };
    (supabase.from as any).mockReturnValue(queryBuilder);
  });

  it('loads application draft history for a user and job', async () => {
    const history = await applicationService.getApplicationDraftHistory('user-1', 'job-1', 3);

    expect(supabase.from).toHaveBeenCalledWith('application_draft_versions');
    expect(queryBuilder.select).toHaveBeenCalledWith('*');
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(queryBuilder.eq).toHaveBeenCalledWith('job_id', 'job-1');
    expect(queryBuilder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(3);
    expect(history[0]).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: 'https://example.test/resume.pdf',
      coverLetter: 'Hello',
      source: 'ai',
      reason: 'ai_applied',
      createdAt: '2026-06-26T10:00:00.000Z',
      updatedAt: '2026-06-26T10:01:00.000Z',
    });
  });

  it('upserts application draft history snapshots by id', async () => {
    const saved = await applicationService.saveApplicationDraftHistoryEntry({
      id: '22222222-2222-4222-8222-222222222222',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: '',
      coverLetter: 'Manual draft',
      source: 'manual',
      reason: 'autosave',
      createdAt: '2026-06-26T10:00:00.000Z',
      updatedAt: '2026-06-26T10:00:30.000Z',
    });

    expect(supabase.from).toHaveBeenCalledWith('application_draft_versions');
    expect(queryBuilder.upsert).toHaveBeenCalledWith({
      id: '22222222-2222-4222-8222-222222222222',
      user_id: 'user-1',
      job_id: 'job-1',
      resume_url: '',
      cover_letter: 'Manual draft',
      source: 'manual',
      reason: 'autosave',
      created_at: '2026-06-26T10:00:00.000Z',
      updated_at: '2026-06-26T10:00:30.000Z',
    }, {
      onConflict: 'id',
    });
    expect(queryBuilder.select).toHaveBeenCalledWith();
    expect(saved.updatedAt).toBe('2026-06-26T10:00:30.000Z');
  });

  it('does not fabricate an application when submit fails', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('database unavailable'),
    });

    await expect(applicationService.submitApplication({
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: 'https://example.test/resume.pdf',
      coverLetter: 'Hello',
    })).rejects.toThrow('Application could not be submitted');

    expect(supabase.from).toHaveBeenCalledWith('job_applications');
    expect(queryBuilder.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      job_id: 'job-1',
      resume_url: 'https://example.test/resume.pdf',
      cover_letter: 'Hello',
      status: 'PENDING',
    });
    expect(supabase.from).not.toHaveBeenCalledWith('application_status_events');
  });

  it('does not return an empty application list when loading applications fails', async () => {
    queryBuilder.order.mockResolvedValueOnce({
      data: null,
      error: new Error('database unavailable'),
    });

    await expect(applicationService.getUserApplications('user-1')).rejects.toThrow('Applications could not be loaded');

    expect(supabase.from).toHaveBeenCalledWith('job_applications');
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('does not fabricate a status update when status persistence fails', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('database unavailable'),
    });

    await expect(applicationService.updateApplicationStatus('app-1', 'INTERVIEW', {
      changedBy: 'recruiter-1',
      previousStatus: 'REVIEWED',
    })).rejects.toThrow('Application status could not be updated');

    expect(queryBuilder.update).toHaveBeenCalledWith({
      status: 'INTERVIEW',
      updated_at: expect.any(String),
    });
    expect(supabase.from).not.toHaveBeenCalledWith('application_status_events');
  });

  it('does not silently withdraw an application when delete fails', async () => {
    queryBuilder.eq.mockResolvedValueOnce({
      error: new Error('database unavailable'),
    });

    await expect(applicationService.withdrawApplication('app-1')).rejects.toThrow('Application could not be withdrawn');

    expect(queryBuilder.delete).toHaveBeenCalled();
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'app-1');
  });
});
