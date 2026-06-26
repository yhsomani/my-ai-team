import { describe, expect, it, vi } from 'vitest';
import {
  appendApplicationDraftHistory,
  buildApplicationDraftHistoryEntry,
  hasApplicationDraftContent,
  mergeApplicationDraftHistories,
  sanitizeApplicationDraftHistory,
} from './applicationDraftHistory';

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'history-id-1'),
});

describe('applicationDraftHistory', () => {
  it('detects draft content from resume URL or cover letter', () => {
    expect(hasApplicationDraftContent({ resumeUrl: ' ', coverLetter: '' })).toBe(false);
    expect(hasApplicationDraftContent({ resumeUrl: 'https://example.test/resume.pdf', coverLetter: '' })).toBe(true);
    expect(hasApplicationDraftContent({ resumeUrl: '', coverLetter: 'Hello recruiter' })).toBe(true);
  });

  it('builds stable history entries with normalized source and timestamps', () => {
    const entry = buildApplicationDraftHistoryEntry({
      userId: ' user-1 ',
      jobId: ' job-1 ',
      resumeUrl: 'https://example.test/resume.pdf',
      coverLetter: 'Hello',
      source: 'profile',
      reason: 'profile_applied',
      createdAt: '2026-06-26T10:00:00.000Z',
    });

    expect(entry).toMatchObject({
      id: 'history-id-1',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: 'https://example.test/resume.pdf',
      coverLetter: 'Hello',
      source: 'profile',
      reason: 'profile_applied',
      createdAt: '2026-06-26T10:00:00.000Z',
      updatedAt: '2026-06-26T10:00:00.000Z',
    });
  });

  it('preserves AI draft source and explicit AI apply reason', () => {
    const entry = buildApplicationDraftHistoryEntry({
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: '',
      coverLetter: 'AI tailored note',
      source: 'ai',
      reason: 'ai_applied',
      createdAt: '2026-06-26T10:00:00.000Z',
    });

    expect(entry).toMatchObject({
      source: 'ai',
      reason: 'ai_applied',
      coverLetter: 'AI tailored note',
    });
  });

  it('coalesces rapid autosaves into the latest checkpoint', () => {
    const first = appendApplicationDraftHistory([], {
      id: 'history-1',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: '',
      coverLetter: 'First draft',
      source: 'manual',
      reason: 'autosave',
      createdAt: '2026-06-26T10:00:00.000Z',
    });
    const second = appendApplicationDraftHistory(first, {
      id: 'history-2',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: '',
      coverLetter: 'First draft with edits',
      source: 'manual',
      reason: 'autosave',
      createdAt: '2026-06-26T10:00:30.000Z',
    });

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      id: 'history-1',
      coverLetter: 'First draft with edits',
      createdAt: '2026-06-26T10:00:00.000Z',
      updatedAt: '2026-06-26T10:00:30.000Z',
    });
  });

  it('keeps distinct checkpoints outside the autosave window', () => {
    const first = appendApplicationDraftHistory([], {
      id: 'history-1',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: '',
      coverLetter: 'First draft',
      source: 'manual',
      reason: 'autosave',
      createdAt: '2026-06-26T10:00:00.000Z',
    });
    const second = appendApplicationDraftHistory(first, {
      id: 'history-2',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: '',
      coverLetter: 'Later draft',
      source: 'manual',
      reason: 'autosave',
      createdAt: '2026-06-26T10:02:00.000Z',
    });

    expect(second.map(entry => entry.id)).toEqual(['history-2', 'history-1']);
  });

  it('preserves explicit restore checkpoints even inside the autosave window', () => {
    const first = appendApplicationDraftHistory([], {
      id: 'history-1',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: '',
      coverLetter: 'Manual draft',
      source: 'manual',
      reason: 'autosave',
      createdAt: '2026-06-26T10:00:00.000Z',
    });
    const restored = appendApplicationDraftHistory(first, {
      id: 'history-2',
      userId: 'user-1',
      jobId: 'job-1',
      resumeUrl: '',
      coverLetter: 'Restored draft',
      source: 'manual',
      reason: 'restored',
      createdAt: '2026-06-26T10:00:30.000Z',
    });

    expect(restored.map(entry => entry.id)).toEqual(['history-2', 'history-1']);
  });

  it('sanitizes, sorts, filters, and caps draft history', () => {
    const sanitized = sanitizeApplicationDraftHistory([
      null,
      {
        id: 'history-old',
        userId: 'user-1',
        jobId: 'job-1',
        resumeUrl: '',
        coverLetter: 'Old',
        source: 'manual',
        reason: 'autosave',
        createdAt: '2026-06-26T09:00:00.000Z',
        updatedAt: '2026-06-26T09:00:00.000Z',
      },
      {
        id: 'history-new',
        userId: 'user-1',
        jobId: 'job-1',
        resumeUrl: '',
        coverLetter: 'New',
        source: 'profile',
        reason: 'profile_applied',
        createdAt: '2026-06-26T10:00:00.000Z',
        updatedAt: '2026-06-26T10:00:00.000Z',
      },
      {
        id: 'history-ai',
        userId: 'user-1',
        jobId: 'job-1',
        resumeUrl: '',
        coverLetter: 'AI',
        source: 'ai',
        reason: 'ai_applied',
        createdAt: '2026-06-26T10:30:00.000Z',
        updatedAt: '2026-06-26T10:30:00.000Z',
      },
      {
        id: 'history-other-job',
        userId: 'user-1',
        jobId: 'job-2',
        resumeUrl: '',
        coverLetter: 'Other',
        source: 'manual',
        reason: 'autosave',
        createdAt: '2026-06-26T11:00:00.000Z',
        updatedAt: '2026-06-26T11:00:00.000Z',
      },
    ], {
      userId: 'user-1',
      jobId: 'job-1',
      maxItems: 1,
    });

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].id).toBe('history-ai');
  });

  it('merges server and local history by newest unique entries', () => {
    const merged = mergeApplicationDraftHistories([
      {
        id: 'server-new',
        userId: 'user-1',
        jobId: 'job-1',
        resumeUrl: '',
        coverLetter: 'Server',
        source: 'manual',
        reason: 'autosave',
        createdAt: '2026-06-26T10:00:00.000Z',
        updatedAt: '2026-06-26T10:00:00.000Z',
      },
    ], [
      {
        id: 'local-old',
        userId: 'user-1',
        jobId: 'job-1',
        resumeUrl: '',
        coverLetter: 'Local',
        source: 'manual',
        reason: 'autosave',
        createdAt: '2026-06-26T09:00:00.000Z',
        updatedAt: '2026-06-26T09:00:00.000Z',
      },
    ]);

    expect(merged.map(entry => entry.id)).toEqual(['server-new', 'local-old']);
  });
});
