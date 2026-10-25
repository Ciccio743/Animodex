import type { NewPhoto } from './observationService';

export const PHOTO_MAX_SIDE = 1600;
export const THUMB_MAX_SIDE = 480;

export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function draw(bitmap: ImageBitmap, max: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Impossible de compresser la photo');
  return { blob, width, height };
}

/**
 * Redimensionne une photo avant stockage local (JPEG, 1600 px max + vignette 480 px).
 * La conversion en JPEG retire aussi les métadonnées EXIF (dont la position GPS éventuelle).
 */
export async function processPhoto(file: File, source: NewPhoto['source']): Promise<NewPhoto> {
  if (!file.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const full = await draw(bitmap, PHOTO_MAX_SIDE, 0.85);
    const thumb = await draw(bitmap, THUMB_MAX_SIDE, 0.8);
    return { blob: full.blob, thumbBlob: thumb.blob, mimeType: 'image/jpeg', width: full.width, height: full.height, source };
  } finally {
    bitmap.close();
  }
}
