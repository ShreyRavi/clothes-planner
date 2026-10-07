import { db } from '../db/schema';
import { write } from '../db/write';
import { addPlacementTx, blankItem, getLastUsed, markBackedUp, setLastUsedTx } from '../db/repo';
import { processImage, storePhotoTx } from '../photos/capture';
import { cleanUrl, looksLikeUrl, safeUrl, siteName } from '../domain/safeUrl';
import { openSheet } from '../state/sheets';
import { showToast } from '../state/store';
import { downloadBlob } from '../share/send';

type Target = { functionId: string; slotId: string } | null | undefined;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;

async function resolveTarget(planId: string, target: Target) {
  if (target) return target;
  return getLastUsed(planId);
}

/** Saves the item at once, into the given or last used slot, or the Inbox (PRD capture flow). */
async function saveCaptured(planId: string, input: Parameters<typeof blankItem>[1], target: Target, photo?: Awaited<ReturnType<typeof processImage>>) {
  const dest = await resolveTarget(planId, target);
  const itemId = await write(async () => {
    const photoId = photo ? await storePhotoTx(photo) : '';
    const item = blankItem(planId, { ...input, photoId });
    await db.items.add(item);
    if (dest) {
      await addPlacementTx(planId, item.id, dest.functionId, dest.slotId);
      await setLastUsedTx(planId, dest.functionId, dest.slotId);
    }
    await db.plans.update(planId, { updatedAt: Date.now() });
    return item.id;
  });
  openSheet({ kind: 'place', planId, itemId, justCaptured: true });
  return itemId;
}

export async function captureFile(planId: string, file: Blob, target?: Target, name = '') {
  const photo = await processImage(file);
  const title = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
  return saveCaptured(planId, { title: /^(img|image|photo|screenshot|pxl|dsc)\b/i.test(title) || !title ? 'Photo' : title }, target, photo);
}

export async function captureLink(planId: string, raw: string, target?: Target) {
  const link = cleanUrl(raw);
  if (!link) {
    showToast("That doesn't look like a web link");
    return null;
  }
  const isImage = IMAGE_EXT.test(link);
  return saveCaptured(planId, { title: siteName(link) || 'Link', link: isImage ? '' : link, imageUrl: isImage ? link : '' }, target);
}

export async function captureImageUrl(planId: string, raw: string, target?: Target) {
  const url = safeUrl(raw);
  if (!url) {
    showToast("That doesn't look like an image address");
    return null;
  }
  return saveCaptured(planId, { title: siteName(url) || 'Image', imageUrl: url }, target);
}

export async function captureText(planId: string, text: string, target?: Target) {
  const trimmed = text.trim();
  const url = trimmed.split(/\s+/).find((w) => looksLikeUrl(w));
  if (url) return captureLink(planId, url, target);
  return saveCaptured(planId, { title: trimmed.slice(0, 120) || 'Note', note: trimmed.length > 120 ? trimmed : '' }, target);
}

/** Back up: one file with everything, local photos included (ST-2). */
export async function runBackup() {
  try {
    const { buildBackup } = await import('../backup/backup');
    const { blob, filename } = await buildBackup();
    downloadBlob(blob, filename);
    await markBackedUp();
    showToast('Backup saved');
  } catch {
    showToast("Couldn't create the backup. Try again.");
  }
}

export function pickRestoreFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.trousseau,application/zip';
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) openSheet({ kind: 'restore', file });
  };
  input.click();
}

/** Ask the browser not to evict our data (PRD storage). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
