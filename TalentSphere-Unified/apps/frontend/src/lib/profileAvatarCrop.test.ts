import { describe, expect, it } from 'vitest';
import {
  defaultProfileAvatarCrop,
  getProfileAvatarCropPreviewStyle,
  getProfileAvatarCropSourceRect,
  normalizeProfileAvatarCrop,
} from './profileAvatarCrop';

describe('profileAvatarCrop', () => {
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
});
