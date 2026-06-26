export interface ProfileAvatarCrop {
  zoom: number;
  focalX: number;
  focalY: number;
}

export interface ProfileAvatarCropSourceRect {
  sx: number;
  sy: number;
  size: number;
}

export const defaultProfileAvatarCrop: ProfileAvatarCrop = {
  zoom: 1,
  focalX: 50,
  focalY: 50,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeProfileAvatarCrop = (crop: Partial<ProfileAvatarCrop> = {}): ProfileAvatarCrop => ({
  zoom: clamp(Number.isFinite(crop.zoom) ? Number(crop.zoom) : defaultProfileAvatarCrop.zoom, 1, 2.5),
  focalX: clamp(Number.isFinite(crop.focalX) ? Number(crop.focalX) : defaultProfileAvatarCrop.focalX, 0, 100),
  focalY: clamp(Number.isFinite(crop.focalY) ? Number(crop.focalY) : defaultProfileAvatarCrop.focalY, 0, 100),
});

export const getProfileAvatarCropPreviewStyle = (crop: ProfileAvatarCrop) => {
  const normalized = normalizeProfileAvatarCrop(crop);

  return {
    objectPosition: `${normalized.focalX}% ${normalized.focalY}%`,
    transform: `scale(${normalized.zoom})`,
    transformOrigin: `${normalized.focalX}% ${normalized.focalY}%`,
  };
};

export const getProfileAvatarCropSourceRect = (
  imageWidth: number,
  imageHeight: number,
  crop: ProfileAvatarCrop
): ProfileAvatarCropSourceRect => {
  const normalized = normalizeProfileAvatarCrop(crop);
  const width = Math.max(1, imageWidth);
  const height = Math.max(1, imageHeight);
  const size = Math.max(1, Math.min(width, height) / normalized.zoom);
  const maxX = Math.max(0, width - size);
  const maxY = Math.max(0, height - size);

  return {
    sx: maxX * (normalized.focalX / 100),
    sy: maxY * (normalized.focalY / 100),
    size,
  };
};

const getProfileAvatarUploadFileName = (fileName: string) => {
  const stem = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    || 'profile-photo';

  return `${stem}-cropped.jpg`;
};

const loadImageFromFile = async (file: File) => {
  const objectUrl = window.URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to read selected image for cropping.'));
      image.src = objectUrl;
    });
    return image;
  } finally {
    window.URL.revokeObjectURL(objectUrl);
  }
};

export const createCroppedProfileAvatarFile = async (
  file: File,
  crop: ProfileAvatarCrop,
  outputSize = 512
) => {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Avatar crop could not be prepared in this browser.');
  }

  const source = getProfileAvatarCropSourceRect(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    crop
  );

  context.drawImage(
    image,
    source.sx,
    source.sy,
    source.size,
    source.size,
    0,
    0,
    outputSize,
    outputSize
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) resolve(nextBlob);
      else reject(new Error('Avatar crop could not be exported.'));
    }, 'image/jpeg', 0.9);
  });

  return new File([blob], getProfileAvatarUploadFileName(file.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
};
