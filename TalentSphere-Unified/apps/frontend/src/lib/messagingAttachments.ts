import type { Message } from '../types/messaging';

const imageExtensions = new Set(['.apng', '.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const videoExtensions = new Set(['.mov', '.mp4', '.mpeg', '.mpg', '.webm']);
const documentExtensions = new Set(['.csv', '.doc', '.docx', '.md', '.pdf', '.ppt', '.pptx', '.rtf', '.txt', '.xls', '.xlsx']);
const archiveExtensions = new Set(['.7z', '.rar', '.zip']);

export const maxMessageAttachmentBytes = 10 * 1024 * 1024;

export type MessagingAttachmentFileTypeCategory = 'image' | 'video' | 'document' | 'archive' | 'other';
export type MessagingAttachmentFileSizeBand = 'empty' | 'small' | 'medium' | 'large' | 'too_large';

const getUrlPathExtension = (url: string) => {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const lastDotIndex = pathname.lastIndexOf('.');
    return lastDotIndex >= 0 ? pathname.slice(lastDotIndex) : '';
  } catch {
    return '';
  }
};

export const normalizeAttachmentUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

export const inferAttachmentMessageType = (url?: string): NonNullable<Message['messageType']> => {
  if (!url) return 'TEXT';

  const extension = getUrlPathExtension(url);
  if (imageExtensions.has(extension)) return 'IMAGE';
  if (videoExtensions.has(extension)) return 'VIDEO';
  return 'FILE';
};

export const isImageAttachment = (message: Pick<Message, 'attachmentUrl' | 'messageType'>) => (
  Boolean(message.attachmentUrl) &&
  (message.messageType === 'IMAGE' || imageExtensions.has(getUrlPathExtension(message.attachmentUrl || '')))
);

export const getAttachmentLabel = (url?: string) => {
  if (!url) return 'Attachment';

  try {
    const parsedUrl = new URL(url);
    const filename = parsedUrl.pathname.split('/').filter(Boolean).pop();
    return filename ? decodeURIComponent(filename) : parsedUrl.hostname;
  } catch {
    return 'Attachment';
  }
};

export const getAttachmentFallbackContent = (url: string) => (
  `Attachment: ${getAttachmentLabel(url)}`
);

export const shouldHideAttachmentFallbackContent = (message: Pick<Message, 'attachmentUrl' | 'content'>) => (
  Boolean(message.attachmentUrl) &&
  message.content === getAttachmentFallbackContent(message.attachmentUrl || '')
);

export const getAttachmentFileTypeCategory = (
  file: Pick<File, 'name' | 'type'>
): MessagingAttachmentFileTypeCategory => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';

  const extension = getUrlPathExtension(`https://local.invalid/${encodeURIComponent(file.name)}`);
  if (documentExtensions.has(extension)) return 'document';
  if (archiveExtensions.has(extension)) return 'archive';
  return 'other';
};

export const getAttachmentFileSizeBand = (size: number): MessagingAttachmentFileSizeBand => {
  if (size <= 0) return 'empty';
  if (size > maxMessageAttachmentBytes) return 'too_large';
  if (size <= 512 * 1024) return 'small';
  if (size <= 5 * 1024 * 1024) return 'medium';
  return 'large';
};

export const validateMessageAttachmentFile = (file: Pick<File, 'size'>) => {
  if (file.size <= 0) {
    return 'Choose a non-empty file before uploading.';
  }

  if (file.size > maxMessageAttachmentBytes) {
    return 'Choose a file up to 10 MB.';
  }

  return null;
};
