import { describe, expect, it, vi } from 'vitest';
import {
  addResumeArtifactRecord,
  addResumeArtifactTombstone,
  buildResumeArtifactRecord,
  copyResumeArtifactUrl,
  createResumeArtifactId,
  filterDeletedResumeArtifacts,
  mergeResumeArtifactLibraries,
  removeResumeArtifactRecord,
  sanitizeResumeArtifactLibrary,
  sanitizeResumeArtifactTombstones,
} from './resumeArtifactLibrary';

describe('resumeArtifactLibrary', () => {
  it('builds safe artifact records from provider URLs', () => {
    const artifact = buildResumeArtifactRecord({
      url: ' https://files.example.com/api/v1/files/download/resumes/resume.pdf ',
      fileName: 'Resume\nFinal.pdf',
      uploadedAt: '2026-06-26T10:00:00.000Z',
    });

    expect(artifact).toEqual({
      id: createResumeArtifactId('https://files.example.com/api/v1/files/download/resumes/resume.pdf'),
      url: 'https://files.example.com/api/v1/files/download/resumes/resume.pdf',
      fileName: 'Resume Final.pdf',
      uploadedAt: '2026-06-26T10:00:00.000Z',
      status: 'active',
      persistedTo: 'local',
    });
  });

  it('rejects invalid artifact URLs', () => {
    expect(buildResumeArtifactRecord({
      url: 'ftp://files.example.com/resume.pdf',
      fileName: 'Resume.pdf',
      uploadedAt: '2026-06-26T10:00:00.000Z',
    })).toBeNull();
  });

  it('sanitizes, dedupes, sorts, and limits artifact history', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:00:00.000Z'));

    const artifacts = sanitizeResumeArtifactLibrary([
      {
        url: 'https://files.example.com/api/v1/files/download/resumes/older.pdf',
        fileName: 'Older.pdf',
        uploadedAt: '2026-06-26T09:00:00.000Z',
      },
      {
        url: 'https://files.example.com/api/v1/files/download/resumes/newer.pdf',
        fileName: 'Newer.pdf',
        uploadedAt: '2026-06-26T11:00:00.000Z',
      },
      {
        url: 'https://files.example.com/api/v1/files/download/resumes/older.pdf',
        fileName: 'Duplicate.pdf',
        uploadedAt: '2026-06-26T10:00:00.000Z',
      },
      {
        url: 'javascript:alert(1)',
        fileName: 'Unsafe.pdf',
        uploadedAt: '2026-06-26T12:00:00.000Z',
      },
      {
        url: 'https://files.example.com/api/v1/files/download/resumes/invalid-date.pdf',
        fileName: '',
        uploadedAt: 'not-a-date',
      },
    ], {
      maxItems: 2,
    });

    expect(artifacts).toEqual([
      {
        id: createResumeArtifactId('https://files.example.com/api/v1/files/download/resumes/invalid-date.pdf'),
        url: 'https://files.example.com/api/v1/files/download/resumes/invalid-date.pdf',
        fileName: 'Resume PDF',
        uploadedAt: '2026-06-26T12:00:00.000Z',
        status: 'active',
        persistedTo: 'local',
      },
      {
        id: createResumeArtifactId('https://files.example.com/api/v1/files/download/resumes/newer.pdf'),
        url: 'https://files.example.com/api/v1/files/download/resumes/newer.pdf',
        fileName: 'Newer.pdf',
        uploadedAt: '2026-06-26T11:00:00.000Z',
        status: 'active',
        persistedTo: 'local',
      },
    ]);

    vi.useRealTimers();
  });

  it('adds and removes artifact records by URL without keeping stale duplicates', () => {
    const current = [{
      id: 'artifact-current',
      url: 'https://files.example.com/api/v1/files/download/resumes/current.pdf',
      fileName: 'Current.pdf',
      uploadedAt: '2026-06-26T09:00:00.000Z',
      status: 'active' as const,
      persistedTo: 'local' as const,
    }];
    const next = addResumeArtifactRecord(current, {
      id: 'artifact-current',
      url: 'https://files.example.com/api/v1/files/download/resumes/current.pdf',
      fileName: 'Updated.pdf',
      uploadedAt: '2026-06-26T11:00:00.000Z',
      status: 'active',
      persistedTo: 'server',
    });

    expect(next).toHaveLength(1);
    expect(next[0].fileName).toBe('Updated.pdf');

    expect(removeResumeArtifactRecord(next, 'https://files.example.com/api/v1/files/download/resumes/current.pdf')).toEqual([]);
  });

  it('maps account-synced rows and filters deleted artifacts by default', () => {
    const active = buildResumeArtifactRecord({
      id: 'artifact-active',
      user_id: 'user-1',
      file_url: 'https://files.example.com/api/v1/files/download/resumes/active.pdf',
      file_name: 'Active.pdf',
      uploaded_at: '2026-06-26T11:00:00.000Z',
      status: 'active',
      persisted_to: 'server',
    });
    const deleted = buildResumeArtifactRecord({
      id: 'artifact-deleted',
      user_id: 'user-1',
      file_url: 'https://files.example.com/api/v1/files/download/resumes/deleted.pdf',
      file_name: 'Deleted.pdf',
      uploaded_at: '2026-06-26T10:00:00.000Z',
      status: 'deleted',
      deleted_at: '2026-06-26T12:00:00.000Z',
      persisted_to: 'server',
    });

    expect(active).toMatchObject({
      id: 'artifact-active',
      userId: 'user-1',
      persistedTo: 'server',
      status: 'active',
    });
    expect(deleted).toMatchObject({
      id: 'artifact-deleted',
      status: 'deleted',
      deletedAt: '2026-06-26T12:00:00.000Z',
    });
    expect(sanitizeResumeArtifactLibrary([active, deleted])).toEqual([active]);
    expect(sanitizeResumeArtifactLibrary([active, deleted], { includeDeleted: true })).toEqual([active, deleted]);
  });

  it('merges server and local artifacts with server precedence', () => {
    const local = buildResumeArtifactRecord({
      url: 'https://files.example.com/api/v1/files/download/resumes/current.pdf',
      fileName: 'Local.pdf',
      uploadedAt: '2026-06-26T10:00:00.000Z',
    });
    const server = buildResumeArtifactRecord({
      id: 'artifact-current',
      userId: 'user-1',
      url: 'https://files.example.com/api/v1/files/download/resumes/current.pdf',
      fileName: 'Server.pdf',
      uploadedAt: '2026-06-26T11:00:00.000Z',
      persistedTo: 'server',
    });

    expect(mergeResumeArtifactLibraries([server!], [local!])).toEqual([server]);
  });

  it('tracks local tombstones for server records that should not reappear', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:00:00.000Z'));

    const artifact = buildResumeArtifactRecord({
      url: 'https://files.example.com/api/v1/files/download/resumes/deleted.pdf',
      fileName: 'Deleted.pdf',
      uploadedAt: '2026-06-26T10:00:00.000Z',
    })!;
    const tombstones = addResumeArtifactTombstone([], artifact);

    expect(sanitizeResumeArtifactTombstones(tombstones)).toEqual([{
      url: artifact.url,
      fileName: 'Deleted.pdf',
      deletedAt: '2026-06-26T12:00:00.000Z',
      persistedTo: 'local',
    }]);
    expect(filterDeletedResumeArtifacts([artifact], tombstones)).toEqual([]);

    vi.useRealTimers();
  });

  it('sanitizes deletion receipts without keeping duplicate URLs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:15:00.000Z'));

    const receipts = sanitizeResumeArtifactTombstones([
      {
        url: 'https://files.example.com/api/v1/files/download/resumes/current.pdf',
        fileName: 'Current\nResume.pdf',
        deletedAt: '2026-06-26T12:00:00.000Z',
        persistedTo: 'server',
      },
      {
        url: 'https://files.example.com/api/v1/files/download/resumes/current.pdf',
        fileName: 'Duplicate.pdf',
        deletedAt: '2026-06-26T12:05:00.000Z',
      },
      {
        url: 'https://files.example.com/api/v1/files/download/resumes/older.pdf',
        deletedAt: 'not-a-date',
      },
      {
        url: 'javascript:alert(1)',
        fileName: 'Unsafe.pdf',
        deletedAt: '2026-06-26T12:10:00.000Z',
      },
    ]);

    expect(receipts).toHaveLength(2);
    expect(receipts[0]).toMatchObject({
      url: 'https://files.example.com/api/v1/files/download/resumes/older.pdf',
      fileName: 'Resume PDF',
      persistedTo: 'local',
    });
    expect(receipts[1]).toEqual({
      url: 'https://files.example.com/api/v1/files/download/resumes/current.pdf',
      fileName: 'Current Resume.pdf',
      deletedAt: '2026-06-26T12:00:00.000Z',
      persistedTo: 'server',
    });

    vi.useRealTimers();
  });

  it('copies normalized artifact URLs through the Clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    await expect(copyResumeArtifactUrl(' https://files.example.com/api/v1/files/download/resumes/current.pdf '))
      .resolves.toBe('https://files.example.com/api/v1/files/download/resumes/current.pdf');

    expect(writeText).toHaveBeenCalledWith('https://files.example.com/api/v1/files/download/resumes/current.pdf');
  });

  it('rejects invalid artifact URLs before copying', async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    await expect(copyResumeArtifactUrl('ftp://files.example.com/current.pdf'))
      .rejects.toThrow('Choose a valid uploaded PDF link before copying.');

    expect(writeText).not.toHaveBeenCalled();
  });
});
