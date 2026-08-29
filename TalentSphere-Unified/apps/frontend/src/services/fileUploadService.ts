import { apiClient } from '../api/axios';
import { normalizeAttachmentUrl } from '../lib/messagingAttachments';

export interface UploadedFileResult {
  url: string;
  folder: string;
}

const extractUploadedFileUrl = (payload: unknown) => {
  const envelope = payload && typeof payload === 'object' && 'data' in payload
    ? (payload as { data?: unknown }).data
    : payload;

  if (typeof envelope === 'string') {
    return normalizeAttachmentUrl(envelope);
  }

  if (envelope && typeof envelope === 'object') {
    const candidate = (envelope as { url?: unknown; fileUrl?: unknown }).url
      || (envelope as { url?: unknown; fileUrl?: unknown }).fileUrl;
    return typeof candidate === 'string' ? normalizeAttachmentUrl(candidate) : null;
  }

  return null;
};

const getApiResponseErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return null;
  const apiResponse = payload as { success?: unknown; message?: unknown; error?: unknown };
  if (apiResponse.success !== false) return null;
  if (typeof apiResponse.message === 'string' && apiResponse.message.trim()) return apiResponse.message;
  if (typeof apiResponse.error === 'string' && apiResponse.error.trim()) return apiResponse.error;
  return 'File operation failed.';
};

export const fileUploadService = {
  uploadFile: async (file: File, folder = 'general'): Promise<UploadedFileResult> => {
    if (!file || file.size <= 0) {
      throw new Error('Choose a non-empty file before uploading.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await apiClient.post('/api/v1/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const url = extractUploadedFileUrl(response.data);

    if (!url) {
      throw new Error('Upload completed without a usable file URL.');
    }

    return {
      url,
      folder,
    };
  },

  deleteFile: async (url: string): Promise<void> => {
    const normalizedUrl = normalizeAttachmentUrl(url);
    if (!normalizedUrl) {
      throw new Error('Choose a valid uploaded file URL before deleting.');
    }

    const response = await apiClient.delete('/api/v1/files', {
      params: {
        url: normalizedUrl,
      },
    });
    const apiError = getApiResponseErrorMessage(response.data);

    if (apiError) {
      throw new Error(apiError);
    }
  },
};
