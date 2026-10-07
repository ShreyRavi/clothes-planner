// Send decision order (design doc SH-0, DR8):
// all files -> overview alone -> phone fallback viewer / desktop download.
// share() must be called straight from the Send tap with ready blobs.

export type SendOutcome = 'shared' | 'cancelled' | 'error' | 'viewer' | 'downloaded';

export function isPhone(): boolean {
  return matchMedia('(pointer: coarse)').matches && innerWidth < 900;
}

export function canShareFiles(files: File[]): boolean {
  try {
    return typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files });
  } catch {
    return false;
  }
}

export function chooseFiles(files: File[], overviewFailed: boolean): { mode: 'share' | 'fallback' | 'blocked'; files: File[] } {
  if (files.length && canShareFiles(files)) return { mode: 'share', files };
  if (files.length && canShareFiles(files.slice(0, 1))) {
    if (overviewFailed) return { mode: 'blocked', files: [] };
    return { mode: 'share', files: files.slice(0, 1) };
  }
  return { mode: 'fallback', files };
}

export async function shareFiles(files: File[], title: string): Promise<SendOutcome> {
  try {
    await navigator.share({ files, title });
    return 'shared';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
