import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import { profileService } from './profileService';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: mockSupabaseClient,
  typedSupabase: mockSupabaseClient,
}));

describe('profileService resume export history', () => {
  let queryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'export-1',
            user_id: 'user-1',
            status: 'ready',
            method: 'html-download',
            file_name: 'Ada-Lovelace-resume.html',
            detail: 'Downloaded a print-ready HTML resume file locally.',
            created_at: '2026-06-26T10:00:00.000Z',
          },
        ],
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'export-2',
          user_id: 'user-1',
          status: 'blocked',
          method: 'browser-print',
          file_name: 'Ada-Lovelace print',
          detail: 'Popup was blocked.',
          created_at: '2026-06-26T11:00:00.000Z',
        },
        error: null,
      }),
    };
    (supabase.from as any).mockReturnValue(queryBuilder);
  });

  it('loads resume export history from Supabase', async () => {
    const history = await profileService.getResumeExportHistory('user-1', 3);

    expect(supabase.from).toHaveBeenCalledWith('resume_export_events');
    expect(queryBuilder.select).toHaveBeenCalledWith('*');
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(3);
    expect(history[0]).toMatchObject({
      id: 'export-1',
      userId: 'user-1',
      status: 'ready',
      method: 'html-download',
      fileName: 'Ada-Lovelace-resume.html',
      persistedTo: 'server',
    });
  });

  it('upserts resume export records by id', async () => {
    const saved = await profileService.saveResumeExportRecord({
      id: 'export-2',
      userId: 'user-1',
      status: 'blocked',
      method: 'browser-print',
      fileName: 'Ada-Lovelace print',
      detail: 'Popup was blocked.',
      createdAt: '2026-06-26T11:00:00.000Z',
      persistedTo: 'local',
    });

    expect(supabase.from).toHaveBeenCalledWith('resume_export_events');
    expect(queryBuilder.upsert).toHaveBeenCalledWith({
      id: 'export-2',
      user_id: 'user-1',
      status: 'blocked',
      method: 'browser-print',
      file_name: 'Ada-Lovelace print',
      detail: 'Popup was blocked.',
      created_at: '2026-06-26T11:00:00.000Z',
    }, {
      onConflict: 'id',
    });
    expect(queryBuilder.select).toHaveBeenCalledWith();
    expect(saved).toMatchObject({
      id: 'export-2',
      persistedTo: 'server',
    });
  });

  it('upserts native PDF resume export records', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'export-pdf',
        user_id: 'user-1',
        status: 'ready',
        method: 'native-pdf',
        file_name: 'Ada-Lovelace-resume.pdf',
        detail: 'Downloaded a native PDF resume file locally.',
        created_at: '2026-06-26T12:00:00.000Z',
      },
      error: null,
    });

    const saved = await profileService.saveResumeExportRecord({
      id: 'export-pdf',
      userId: 'user-1',
      status: 'ready',
      method: 'native-pdf',
      fileName: 'Ada-Lovelace-resume.pdf',
      detail: 'Downloaded a native PDF resume file locally.',
      createdAt: '2026-06-26T12:00:00.000Z',
      persistedTo: 'local',
    });

    expect(queryBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'export-pdf',
      method: 'native-pdf',
      file_name: 'Ada-Lovelace-resume.pdf',
    }), {
      onConflict: 'id',
    });
    expect(saved).toMatchObject({
      id: 'export-pdf',
      method: 'native-pdf',
      persistedTo: 'server',
    });
  });

  it('upserts provider-backed PDF resume export records', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'export-provider-pdf',
        user_id: 'user-1',
        status: 'ready',
        method: 'provider-pdf',
        file_name: 'Ada-Lovelace-resume.pdf',
        detail: 'Uploaded a native PDF resume artifact through file service.',
        created_at: '2026-06-26T12:30:00.000Z',
      },
      error: null,
    });

    const saved = await profileService.saveResumeExportRecord({
      id: 'export-provider-pdf',
      userId: 'user-1',
      status: 'ready',
      method: 'provider-pdf',
      fileName: 'Ada-Lovelace-resume.pdf',
      detail: 'Uploaded a native PDF resume artifact through file service.',
      createdAt: '2026-06-26T12:30:00.000Z',
      persistedTo: 'local',
    });

    expect(queryBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'export-provider-pdf',
      method: 'provider-pdf',
      file_name: 'Ada-Lovelace-resume.pdf',
    }), {
      onConflict: 'id',
    });
    expect(saved).toMatchObject({
      id: 'export-provider-pdf',
      method: 'provider-pdf',
      persistedTo: 'server',
    });
  });

  it('loads active resume artifacts from Supabase', async () => {
    queryBuilder.limit.mockResolvedValueOnce({
      data: [
        {
          id: 'artifact-1',
          user_id: 'user-1',
          file_name: 'Ada-Lovelace-resume.pdf',
          file_url: 'https://files.example.com/api/v1/files/download/resumes/ada.pdf',
          status: 'active',
          uploaded_at: '2026-06-26T13:00:00.000Z',
          deleted_at: null,
        },
      ],
      error: null,
    });

    const artifacts = await profileService.getResumeArtifacts('user-1', 3);

    expect(supabase.from).toHaveBeenCalledWith('resume_artifacts');
    expect(queryBuilder.select).toHaveBeenCalledWith('*');
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'active');
    expect(queryBuilder.order).toHaveBeenCalledWith('uploaded_at', { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(3);
    expect(artifacts[0]).toMatchObject({
      id: 'artifact-1',
      userId: 'user-1',
      fileName: 'Ada-Lovelace-resume.pdf',
      url: 'https://files.example.com/api/v1/files/download/resumes/ada.pdf',
      status: 'active',
      persistedTo: 'server',
    });
  });

  it('upserts resume artifact metadata by id', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'artifact-2',
        user_id: 'user-1',
        file_name: 'Ada-Lovelace-resume.pdf',
        file_url: 'https://files.example.com/api/v1/files/download/resumes/ada-2.pdf',
        status: 'active',
        uploaded_at: '2026-06-26T13:30:00.000Z',
        deleted_at: null,
      },
      error: null,
    });

    const saved = await profileService.saveResumeArtifactRecord({
      id: 'artifact-2',
      userId: 'user-1',
      fileName: 'Ada-Lovelace-resume.pdf',
      url: 'https://files.example.com/api/v1/files/download/resumes/ada-2.pdf',
      uploadedAt: '2026-06-26T13:30:00.000Z',
      status: 'active',
      persistedTo: 'local',
    });

    expect(supabase.from).toHaveBeenCalledWith('resume_artifacts');
    expect(queryBuilder.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'artifact-2',
      user_id: 'user-1',
      file_name: 'Ada-Lovelace-resume.pdf',
      file_url: 'https://files.example.com/api/v1/files/download/resumes/ada-2.pdf',
      status: 'active',
      uploaded_at: '2026-06-26T13:30:00.000Z',
      deleted_at: null,
    }), {
      onConflict: 'id',
    });
    expect(saved).toMatchObject({
      id: 'artifact-2',
      persistedTo: 'server',
    });
  });

  it('marks resume artifact metadata deleted by id and user', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'artifact-3',
        user_id: 'user-1',
        file_name: 'Ada-Lovelace-resume.pdf',
        file_url: 'https://files.example.com/api/v1/files/download/resumes/ada-3.pdf',
        status: 'deleted',
        uploaded_at: '2026-06-26T14:00:00.000Z',
        deleted_at: '2026-06-26T14:30:00.000Z',
      },
      error: null,
    });

    const deleted = await profileService.markResumeArtifactDeleted({
      id: 'artifact-3',
      userId: 'user-1',
      deletedAt: '2026-06-26T14:30:00.000Z',
    });

    expect(supabase.from).toHaveBeenCalledWith('resume_artifacts');
    expect(queryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'deleted',
      deleted_at: '2026-06-26T14:30:00.000Z',
    }));
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'artifact-3');
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleted).toMatchObject({
      id: 'artifact-3',
      status: 'deleted',
      deletedAt: '2026-06-26T14:30:00.000Z',
      persistedTo: 'server',
    });
  });

  it('updates the auth profile avatar URL', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        avatar_url: 'https://files.example.com/api/v1/files/download/avatars/avatar.png',
      },
      error: null,
    });

    const updated = await profileService.updateAvatar(
      'user-1',
      'https://files.example.com/api/v1/files/download/avatars/avatar.png'
    );

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(queryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      avatar_url: 'https://files.example.com/api/v1/files/download/avatars/avatar.png',
      updated_at: expect.any(String),
    }));
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(queryBuilder.select).toHaveBeenCalledWith('id, avatar_url');
    expect(updated).toMatchObject({
      id: 'user-1',
      avatarUrl: 'https://files.example.com/api/v1/files/download/avatars/avatar.png',
    });
  });

  it('clears the auth profile avatar URL', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        avatar_url: null,
      },
      error: null,
    });

    const updated = await profileService.updateAvatar('user-1', null);

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(queryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      avatar_url: null,
      updated_at: expect.any(String),
    }));
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(updated).toMatchObject({
      id: 'user-1',
      avatarUrl: '',
    });
  });

  it('throws when avatar URL update fails', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Update failed'),
    });

    await expect(profileService.updateAvatar('user-1', 'https://files.example.com/avatar.png'))
      .rejects.toThrow('Update failed');
  });
});
