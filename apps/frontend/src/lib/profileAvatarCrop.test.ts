import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCroppedProfileAvatarFile,
  defaultProfileAvatarCrop,
  getProfileAvatarCropPreviewStyle,
  getProfileAvatarCropSourceRect,
  normalizeProfileAvatarCrop,
} from './profileAvatarCrop';

describe('profileAvatarCrop', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('normalizes crop controls to safe bounds', () => {
    expect(normalizeProfileAvatarCrop({ zoom: 0, focalX: -20, focalY: 140 })).toEqual({
      zoom: 1,
      focalX: 0,
      focalY: 100,
    });

    expect(normalizeProfileAvatarCrop({ zoom: 4, focalX: 80, focalY: 20 })).toEqual({
      zoom: 2.5,
      focalX: 80,
      focalY: 20,
    });

    expect(normalizeProfileAvatarCrop()).toEqual(defaultProfileAvatarCrop);
  });

  it('calculates centered square crop source rectangles', () => {
    expect(getProfileAvatarCropSourceRect(1200, 800, defaultProfileAvatarCrop)).toEqual({
      sx: 200,
      sy: 0,
      size: 800,
    });
  });

  it('uses focal point and zoom for tighter crops', () => {
    expect(getProfileAvatarCropSourceRect(1000, 800, {
      zoom: 2,
      focalX: 100,
      focalY: 25,
    })).toEqual({
      sx: 600,
      sy: 100,
      size: 400,
    });
  });

  it('returns preview styles that match the selected focal point', () => {
    expect(getProfileAvatarCropPreviewStyle({
      zoom: 1.5,
      focalX: 25,
      focalY: 75,
    })).toEqual({
      objectPosition: '25% 75%',
      transform: 'scale(1.5)',
      transformOrigin: '25% 75%',
    });
  });

  it('falls back to data URL export when canvas toBlob does not resolve', async () => {
    class MockImage {
      decoding = 'async';
      naturalWidth = 2;
      naturalHeight = 2;
      width = 2;
      height = 2;
      onload: (() => void) | null = null;

      set src(_value: string) {
        window.setTimeout(() => this.onload?.(), 0);
      }
    }

    const drawImage = vi.fn();
    const toBlob = vi.fn();
    const toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,ZmFsbGJhY2s=');
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toBlob,
      toDataURL,
    } as unknown as HTMLCanvasElement;
    const originalCreateElement = Document.prototype.createElement;

    vi.stubGlobal('Image', MockImage);
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:profile-avatar');
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (
      tagName === 'canvas'
        ? fakeCanvas
        : originalCreateElement.call(document, tagName)
    )) as typeof document.createElement);

    const file = await createCroppedProfileAvatarFile(
      new File(['avatar'], 'profile-photo.png', { type: 'image/png' }),
      defaultProfileAvatarCrop,
      16,
      0,
    );

    expect(toBlob).toHaveBeenCalled();
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
    expect(drawImage).toHaveBeenCalled();
    expect(file.name).toBe('profile-photo-cropped.jpg');
    expect(file.type).toBe('image/jpeg');
    await expect(file.text()).resolves.toBe('fallback');
  });
});
