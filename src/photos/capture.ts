import { db } from '../db/schema';
import { newId } from '../domain/ids';
import type { PhotoSize } from '../domain/types';

// Local photos are resized on capture: full at about 1,600 px long edge, plus a
// 320 px thumb stored as its own row so lists never load full images (eng D10).
export const FULL_EDGE = 1600;
export const THUMB_EDGE = 320;

async function decode(blob: Blob): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    // Fallback: let the <img> decoder try (older Safari).
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      await img.decode();
      URL.revokeObjectURL(url);
      return img;
    } catch {
      return null;
    }
  }
}

function scaleTo(src: ImageBitmap | HTMLImageElement, edge: number): Promise<Blob | null> {
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const k = Math.min(1, edge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * k));
  const ch = Math.max(1, Math.round(h * k));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cw, ch);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82));
}

export interface PhotoBytes {
  type: string;
  data: ArrayBuffer;
}
export interface ProcessedPhoto {
  full: PhotoBytes;
  thumb: PhotoBytes | null;
}

async function bytes(blob: Blob): Promise<PhotoBytes> {
  return { type: blob.type || 'image/jpeg', data: await blob.arrayBuffer() };
}

/**
 * Resizes an image; if the browser cannot decode it (for example HEIC on Android),
 * keeps the original. Runs before write(): awaiting non-database work inside a
 * transaction would commit it early.
 */
export async function processImage(blob: Blob): Promise<ProcessedPhoto> {
  const img = await decode(blob);
  if (!img) return { full: await bytes(blob), thumb: null };
  const [full, thumb] = await Promise.all([scaleTo(img, FULL_EDGE), scaleTo(img, THUMB_EDGE)]);
  if ('close' in img) img.close();
  return { full: await bytes(full ?? blob), thumb: thumb ? await bytes(thumb) : null };
}

/** Must run inside a write() transaction. Returns the new photoId. */
export async function storePhotoTx(photo: ProcessedPhoto): Promise<string> {
  const photoId = newId();
  await db.photos.put({ photoId, size: 'full', ...photo.full });
  if (photo.thumb) await db.photos.put({ photoId, size: 'thumb', ...photo.thumb });
  return photoId;
}

export async function getPhoto(photoId: string, size: PhotoSize): Promise<Blob | null> {
  if (!photoId) return null;
  const row = (await db.photos.get([photoId, size])) ?? (size === 'thumb' ? await db.photos.get([photoId, 'full']) : undefined);
  return row ? new Blob([row.data], { type: row.type }) : null;
}
