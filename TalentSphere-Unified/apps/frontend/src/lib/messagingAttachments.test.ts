import { describe, expect, it } from 'vitest';
import {
  getAttachmentFallbackContent,
  getAttachmentFileSizeBand,
  getAttachmentFileTypeCategory,
  getAttachmentLabel,
  inferAttachmentMessageType,
  isImageAttachment,
  normalizeAttachmentUrl,
  shouldHideAttachmentFallbackContent,
  validateMessageAttachmentFile,
} from './messagingAttachments';

describe('messagingAttachments', () => {
  it('normalizes only http and https attachment URLs', () => {
    expect(normalizeAttachmentUrl(' https://example.com/file.pdf ')).toBe('https://example.com/file.pdf');
    expect(normalizeAttachmentUrl('http://example.com/image.png')).toBe('http://example.com/image.png');
    expect(normalizeAttachmentUrl('ftp://example.com/file.pdf')).toBeNull();
    expect(normalizeAttachmentUrl('not a url')).toBeNull();
  });

  it('infers message types from attachment file extensions', () => {
    expect(inferAttachmentMessageType('https://example.com/photo.PNG')).toBe('IMAGE');
    expect(inferAttachmentMessageType('https://example.com/video.webm')).toBe('VIDEO');
    expect(inferAttachmentMessageType('https://example.com/report.pdf')).toBe('FILE');
    expect(inferAttachmentMessageType()).toBe('TEXT');
  });

  it('derives readable attachment labels', () => {
    expect(getAttachmentLabel('https://example.com/docs/My%20Resume.pdf')).toBe('My Resume.pdf');
    expect(getAttachmentLabel('https://example.com')).toBe('example.com');
    expect(getAttachmentLabel()).toBe('Attachment');
  });

  it('identifies image attachments from type or URL', () => {
    expect(isImageAttachment({ attachmentUrl: 'https://example.com/file.jpg', messageType: 'FILE' })).toBe(true);
    expect(isImageAttachment({ attachmentUrl: 'https://example.com/file.bin', messageType: 'IMAGE' })).toBe(true);
    expect(isImageAttachment({ attachmentUrl: 'https://example.com/file.pdf', messageType: 'FILE' })).toBe(false);
  });

  it('hides generated fallback captions while preserving user captions', () => {
    const url = 'https://example.com/file.pdf';

    expect(getAttachmentFallbackContent(url)).toBe('Attachment: file.pdf');
    expect(shouldHideAttachmentFallbackContent({
      attachmentUrl: url,
      content: 'Attachment: file.pdf',
    })).toBe(true);
    expect(shouldHideAttachmentFallbackContent({
      attachmentUrl: url,
      content: 'Please review this file',
    })).toBe(false);
  });

  it('classifies selected file attachments without exposing file names', () => {
    expect(getAttachmentFileTypeCategory({ name: 'resume.pdf', type: 'application/pdf' })).toBe('document');
    expect(getAttachmentFileTypeCategory({ name: 'photo.bin', type: 'image/png' })).toBe('image');
    expect(getAttachmentFileTypeCategory({ name: 'archive.zip', type: 'application/octet-stream' })).toBe('archive');
    expect(getAttachmentFileTypeCategory({ name: 'unknown.bin', type: 'application/octet-stream' })).toBe('other');
  });

  it('validates upload size and reports bounded size bands', () => {
    expect(validateMessageAttachmentFile({ size: 0 })).toBe('Choose a non-empty file before uploading.');
    expect(validateMessageAttachmentFile({ size: 11 * 1024 * 1024 })).toBe('Choose a file up to 10 MB.');
    expect(validateMessageAttachmentFile({ size: 1024 })).toBeNull();

    expect(getAttachmentFileSizeBand(0)).toBe('empty');
    expect(getAttachmentFileSizeBand(1024)).toBe('small');
    expect(getAttachmentFileSizeBand(2 * 1024 * 1024)).toBe('medium');
    expect(getAttachmentFileSizeBand(8 * 1024 * 1024)).toBe('large');
    expect(getAttachmentFileSizeBand(11 * 1024 * 1024)).toBe('too_large');
  });
});
