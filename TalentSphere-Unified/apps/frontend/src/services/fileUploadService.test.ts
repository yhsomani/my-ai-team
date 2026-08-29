import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/axios';
import { fileUploadService } from './fileUploadService';

vi.mock('../api/axios', () => ({
  apiClient: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('fileUploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads a file and accepts string ApiResponse data', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: 'https://files.example.com/messages/report.pdf',
      },
    });

    const file = new File(['content'], 'report.pdf', { type: 'application/pdf' });
    const result = await fileUploadService.uploadFile(file, 'messages');

    expect(result).toEqual({
      url: 'https://files.example.com/messages/report.pdf',
      folder: 'messages',
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/files/upload',
      expect.any(FormData),
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  });

  it('uploads a file and accepts object ApiResponse data', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          url: 'https://files.example.com/messages/image.png',
        },
      },
    });

    const file = new File(['content'], 'image.png', { type: 'image/png' });
    const result = await fileUploadService.uploadFile(file, 'messages');

    expect(result.url).toBe('https://files.example.com/messages/image.png');
  });

  it('rejects empty files before posting', async () => {
    const file = new File([], 'empty.txt', { type: 'text/plain' });

    await expect(fileUploadService.uploadFile(file, 'messages')).rejects.toThrow('Choose a non-empty file before uploading.');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('rejects upload responses without usable http URLs', async () => {
    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          url: 'ftp://files.example.com/messages/file.pdf',
        },
      },
    });

    const file = new File(['content'], 'file.pdf', { type: 'application/pdf' });

    await expect(fileUploadService.uploadFile(file, 'messages')).rejects.toThrow('Upload completed without a usable file URL.');
  });

  it('deletes an uploaded file by normalized URL', async () => {
    (apiClient.delete as any).mockResolvedValueOnce({
      data: {
        success: true,
      },
    });

    await expect(fileUploadService.deleteFile(' https://files.example.com/api/v1/files/download/resumes/resume.pdf '))
      .resolves.toBeUndefined();

    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/files', {
      params: {
        url: 'https://files.example.com/api/v1/files/download/resumes/resume.pdf',
      },
    });
  });

  it('rejects invalid delete URLs before calling the API', async () => {
    await expect(fileUploadService.deleteFile('javascript:alert(1)')).rejects.toThrow('Choose a valid uploaded file URL before deleting.');

    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('surfaces provider delete errors', async () => {
    (apiClient.delete as any).mockResolvedValueOnce({
      data: {
        success: false,
        message: 'Invalid file URL',
      },
    });

    await expect(fileUploadService.deleteFile('https://files.example.com/not-local.pdf')).rejects.toThrow('Invalid file URL');
  });
});
