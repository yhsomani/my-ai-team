import { describe, expect, it, vi } from 'vitest';
import {
  buildResumeExportRecord,
  mergeResumeExportHistories,
  sanitizeResumeExportHistory,
} from './resumeExportHistory';

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'export-id-1'),
});

describe('resumeExportHistory', () => {
  it('builds local export records with safe defaults', () => {
    const record = buildResumeExportRecord({
      userId: ' user-1 ',
      status: 'ready',
      method: 'html-download',
      fileName: ' ',
      detail: '',
      createdAt: '2026-06-26T10:00:00.000Z',
    });

    expect(record).toMatchObject({
      id: 'export-id-1',
      userId: 'user-1',
      status: 'ready',
      method: 'html-download',
      fileName: 'Resume export',
      detail: 'Resume export activity recorded.',
      persistedTo: 'local',
      createdAt: '2026-06-26T10:00:00.000Z',
    });
  });

  it('accepts native PDF export records', () => {
    const records = sanitizeResumeExportHistory([
      {
        id: 'pdf',
        userId: 'user-1',
        status: 'ready',
        method: 'native-pdf',
        fileName: 'Ada-Lovelace-resume.pdf',
        detail: 'Downloaded a native PDF resume file locally.',
        createdAt: '2026-06-26T10:00:00.000Z',
        persistedTo: 'local',
      },
    ], {
      userId: 'user-1',
    });

    expect(records).toEqual([
      expect.objectContaining({
        id: 'pdf',
        method: 'native-pdf',
        fileName: 'Ada-Lovelace-resume.pdf',
      }),
    ]);
  });

  it('accepts provider-backed PDF export records', () => {
    const records = sanitizeResumeExportHistory([
      {
        id: 'provider-pdf',
        userId: 'user-1',
        status: 'ready',
        method: 'provider-pdf',
        fileName: 'Ada-Lovelace-resume.pdf',
        detail: 'Uploaded a native PDF resume artifact through file service.',
        createdAt: '2026-06-26T10:05:00.000Z',
        persistedTo: 'server',
      },
    ], {
      userId: 'user-1',
    });

    expect(records).toEqual([
      expect.objectContaining({
        id: 'provider-pdf',
        method: 'provider-pdf',
        persistedTo: 'server',
      }),
    ]);
  });

  it('sanitizes, filters, sorts, de-duplicates, and caps export records', () => {
    const records = sanitizeResumeExportHistory([
      null,
      {
        id: 'old',
        userId: 'user-1',
        status: 'ready',
        method: 'browser-print',
        fileName: 'Old print',
        detail: 'Old',
        createdAt: '2026-06-25T10:00:00.000Z',
        persistedTo: 'local',
      },
      {
        id: 'new',
        userId: 'user-1',
        status: 'blocked',
        method: 'browser-print',
        fileName: 'New print',
        detail: 'Blocked',
        createdAt: '2026-06-26T10:00:00.000Z',
        persistedTo: 'server',
      },
      {
        id: 'other-user',
        userId: 'user-2',
        status: 'ready',
        method: 'html-download',
        fileName: 'Other',
        detail: 'Other',
        createdAt: '2026-06-27T10:00:00.000Z',
        persistedTo: 'server',
      },
      {
        id: 'new',
        userId: 'user-1',
        status: 'ready',
        method: 'html-download',
        fileName: 'Duplicate',
        detail: 'Duplicate',
        createdAt: '2026-06-26T11:00:00.000Z',
        persistedTo: 'local',
      },
    ], {
      userId: 'user-1',
      maxItems: 1,
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: 'new',
      persistedTo: 'server',
      status: 'blocked',
    });
  });

  it('merges server and local records newest-first', () => {
    const merged = mergeResumeExportHistories([
      {
        id: 'server-new',
        userId: 'user-1',
        status: 'ready',
        method: 'html-download',
        fileName: 'Server',
        detail: 'Server',
        createdAt: '2026-06-26T10:00:00.000Z',
        persistedTo: 'server',
      },
    ], [
      {
        id: 'local-old',
        userId: 'user-1',
        status: 'ready',
        method: 'browser-print',
        fileName: 'Local',
        detail: 'Local',
        createdAt: '2026-06-25T10:00:00.000Z',
        persistedTo: 'local',
      },
    ]);

    expect(merged.map(record => record.id)).toEqual(['server-new', 'local-old']);
  });
});
