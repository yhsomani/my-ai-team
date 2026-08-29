import { describe, expect, it, vi } from 'vitest';
import {
  appendJobPostDraftHistory,
  buildJobPostDraftHistoryEntry,
  hasJobPostDraftHistoryContent,
  mergeJobPostDraftHistories,
  sanitizeJobPostDraftHistory,
  toJobPostDraftFromHistoryEntry,
} from './jobPostDraftHistory';
import { defaultJobPostDraft } from './jobPostTemplates';

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'job-history-id-1'),
});

const draft = {
  ...defaultJobPostDraft,
  title: 'Frontend Engineer',
  description: 'Build product UI.',
  location: 'Remote',
  salaryMin: '100000',
  salaryMax: '140000',
  requirements: '- React\n- TypeScript',
};

describe('jobPostDraftHistory', () => {
  it('detects useful job-post draft content', () => {
    expect(hasJobPostDraftHistoryContent(defaultJobPostDraft)).toBe(false);
    expect(hasJobPostDraftHistoryContent({ ...defaultJobPostDraft, title: 'Backend Engineer' })).toBe(true);
    expect(hasJobPostDraftHistoryContent({ ...defaultJobPostDraft, requirements: '- Java' })).toBe(true);
  });

  it('builds local history entries with normalized fields', () => {
    const entry = buildJobPostDraftHistoryEntry({
      recruiterId: ' recruiter-1 ',
      draftKey: ' draft-1 ',
      jobId: ' job-1 ',
      draft,
      companyId: ' company-1 ',
      companyName: ' Acme Labs ',
      companyAttached: true,
      reason: 'reviewed',
      createdAt: '2026-06-26T10:00:00.000Z',
    });

    expect(entry).toMatchObject({
      id: 'job-history-id-1',
      recruiterId: 'recruiter-1',
      draftKey: 'draft-1',
      jobId: 'job-1',
      title: 'Frontend Engineer',
      companyId: 'company-1',
      companyName: 'Acme Labs',
      companyAttached: true,
      reason: 'reviewed',
      persistedTo: 'local',
      createdAt: '2026-06-26T10:00:00.000Z',
      updatedAt: '2026-06-26T10:00:00.000Z',
    });
  });

  it('coalesces rapid autosaves into the latest checkpoint', () => {
    const first = appendJobPostDraftHistory([], {
      id: 'history-1',
      recruiterId: 'recruiter-1',
      draftKey: 'draft-1',
      draft,
      reason: 'autosave',
      createdAt: '2026-06-26T10:00:00.000Z',
    });
    const second = appendJobPostDraftHistory(first, {
      id: 'history-2',
      recruiterId: 'recruiter-1',
      draftKey: 'draft-1',
      draft: { ...draft, title: 'Senior Frontend Engineer' },
      reason: 'autosave',
      createdAt: '2026-06-26T10:00:30.000Z',
    });

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      id: 'history-1',
      title: 'Senior Frontend Engineer',
      createdAt: '2026-06-26T10:00:00.000Z',
      updatedAt: '2026-06-26T10:00:30.000Z',
    });
  });

  it('preserves explicit restore checkpoints inside the autosave window', () => {
    const first = appendJobPostDraftHistory([], {
      id: 'history-1',
      recruiterId: 'recruiter-1',
      draftKey: 'draft-1',
      draft,
      reason: 'autosave',
      createdAt: '2026-06-26T10:00:00.000Z',
    });
    const restored = appendJobPostDraftHistory(first, {
      id: 'history-2',
      recruiterId: 'recruiter-1',
      draftKey: 'draft-1',
      draft: { ...draft, title: 'Restored Frontend Engineer' },
      reason: 'restored',
      createdAt: '2026-06-26T10:00:30.000Z',
    });

    expect(restored.map(entry => entry.id)).toEqual(['history-2', 'history-1']);
  });

  it('sanitizes, sorts, filters, and caps draft history', () => {
    const sanitized = sanitizeJobPostDraftHistory([
      null,
      {
        id: 'history-old',
        recruiterId: 'recruiter-1',
        draftKey: 'draft-1',
        ...draft,
        title: 'Old title',
        companyAttached: false,
        reason: 'autosave',
        createdAt: '2026-06-26T09:00:00.000Z',
        updatedAt: '2026-06-26T09:00:00.000Z',
      },
      {
        id: 'history-new',
        recruiterId: 'recruiter-1',
        draftKey: 'draft-1',
        ...draft,
        title: 'New title',
        companyAttached: true,
        companyId: 'company-1',
        companyName: 'Acme',
        reason: 'saved',
        persistedTo: 'server',
        createdAt: '2026-06-26T10:00:00.000Z',
        updatedAt: '2026-06-26T10:00:00.000Z',
      },
      {
        id: 'history-other',
        recruiterId: 'recruiter-1',
        draftKey: 'draft-2',
        ...draft,
        companyAttached: false,
        reason: 'autosave',
        createdAt: '2026-06-26T11:00:00.000Z',
        updatedAt: '2026-06-26T11:00:00.000Z',
      },
    ], {
      recruiterId: 'recruiter-1',
      draftKey: 'draft-1',
      maxItems: 1,
    });

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]).toMatchObject({
      id: 'history-new',
      persistedTo: 'server',
    });
  });

  it('merges server and local history by newest unique entries', () => {
    const merged = mergeJobPostDraftHistories([
      {
        id: 'server-new',
        recruiterId: 'recruiter-1',
        draftKey: 'draft-1',
        ...draft,
        companyAttached: false,
        reason: 'saved',
        persistedTo: 'server',
        createdAt: '2026-06-26T10:00:00.000Z',
        updatedAt: '2026-06-26T10:00:00.000Z',
      },
    ], [
      {
        id: 'local-old',
        recruiterId: 'recruiter-1',
        draftKey: 'draft-1',
        ...draft,
        companyAttached: false,
        reason: 'autosave',
        persistedTo: 'local',
        createdAt: '2026-06-26T09:00:00.000Z',
        updatedAt: '2026-06-26T09:00:00.000Z',
      },
    ]);

    expect(merged.map(entry => entry.id)).toEqual(['server-new', 'local-old']);
  });

  it('converts a history entry back to an editable draft', () => {
    const entry = buildJobPostDraftHistoryEntry({
      recruiterId: 'recruiter-1',
      draftKey: 'draft-1',
      draft,
    });

    expect(toJobPostDraftFromHistoryEntry(entry)).toMatchObject({
      title: 'Frontend Engineer',
      requirements: '- React\n- TypeScript',
    });
  });
});
