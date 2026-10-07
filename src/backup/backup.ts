import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { db } from '../db/schema';
import { collect, removeSnapshot, restoreSnapshot, type Snapshot } from '../db/undo';
import { remapBundle } from '../db/repo';
import { write } from '../db/write';
import { safeUrl } from '../domain/safeUrl';
import { STATUSES, type Fn, type Item, type Placement, type Plan, type Preset, type Slot } from '../domain/types';

// Backup file (.trousseau): a zip of data.json plus photos/<photoId>/<size>.
// Restore never overwrites silently: replace or keep both, always with fresh
// ids (eng D6), size caps and validation before anything is written (eng D5).

export const BACKUP_FORMAT = 'trousseau-backup';
export const BACKUP_VERSION = 1;
export const MAX_PHOTOS = 2000;
export const MAX_UNCOMPRESSED = 1024 * 1024 * 1024;

export class BackupError extends Error {
  constructor(public reason: 'not-backup' | 'too-large' | 'version' | 'invalid', detail = '') {
    super(detail || reason);
  }
}

export async function buildBackup(): Promise<{ blob: Blob; filename: string; photoCount: number }> {
  const snap = await db.transaction('r', [db.plans, db.functions, db.slots, db.items, db.placements, db.photos, db.presets, db.meta], () => collect('all'));
  const data = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    plans: snap.plans,
    functions: snap.functions,
    slots: snap.slots,
    items: snap.items,
    placements: snap.placements,
    presets: snap.presets,
  };
  const files: Zippable = { 'data.json': [strToU8(JSON.stringify(data)), { level: 6 }] };
  for (const ph of snap.photos) {
    const ext = ph.type === 'image/png' ? 'png' : ph.type === 'image/webp' ? 'webp' : 'jpg';
    files[`photos/${ph.photoId}/${ph.size}.${ext}`] = [new Uint8Array(ph.data), { level: 0 }];
  }
  const zipped = zipSync(files);
  const filename = `trousseau-${new Date().toISOString().slice(0, 10)}.trousseau`;
  return { blob: new Blob([zipped as BlobPart], { type: 'application/zip' }), filename, photoCount: snap.photos.length };
}

const str = (v: unknown, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : '');
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 64;

export async function parseBackup(file: Blob): Promise<{ snapshot: Snapshot; planTitles: string[] }> {
  if (file.size > MAX_UNCOMPRESSED) throw new BackupError('too-large', 'File is larger than 1 GB');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let photoCount = 0;
  let total = 0;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      filter(f) {
        total += f.originalSize;
        if (f.name.startsWith('photos/')) photoCount++;
        if (photoCount > MAX_PHOTOS) throw new BackupError('too-large', `More than ${MAX_PHOTOS} photos`);
        if (total > MAX_UNCOMPRESSED) throw new BackupError('too-large', 'Unpacks to more than 1 GB');
        return true;
      },
    });
  } catch (e) {
    if (e instanceof BackupError) throw e;
    throw new BackupError('not-backup', 'Not a zip file');
  }
  const json = entries['data.json'];
  if (!json) throw new BackupError('not-backup', 'No data.json in the file');
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(strFromU8(json));
  } catch {
    throw new BackupError('invalid', 'data.json is damaged');
  }
  if (data.format !== BACKUP_FORMAT) throw new BackupError('not-backup', 'Not a Trousseau backup');
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) throw new BackupError('version', 'Made with a newer version of Trousseau');

  const list = (k: string) => {
    const v = data[k];
    if (!Array.isArray(v)) throw new BackupError('invalid', `${k} is missing`);
    return v as Record<string, unknown>[];
  };
  const plans: Plan[] = list('plans').map((p) => {
    if (!isId(p.id)) throw new BackupError('invalid', 'A plan has no id');
    return {
      id: p.id, title: str(p.title, 200) || 'Restored plan', owner: str(p.owner, 200),
      preset: p.preset === 'men' || p.preset === 'custom' ? p.preset : 'women', templateId: str(p.templateId, 64), place: str(p.place, 200),
      startDate: str(p.startDate, 10), endDate: str(p.endDate, 10), notes: str(p.notes), sharedOn: str(p.sharedOn, 10) || undefined,
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(), updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
    };
  });
  const planIds = new Set(plans.map((p) => p.id));
  const owned = (r: Record<string, unknown>, what: string) => {
    if (!isId(r.id) || !isId(r.planId) || !planIds.has(r.planId)) throw new BackupError('invalid', `A ${what} refers to a missing plan`);
  };
  const functions: Fn[] = list('functions').map((f) => {
    owned(f, 'function');
    return {
      id: f.id as string, planId: f.planId as string, name: str(f.name, 200) || 'Function', date: str(f.date, 10), timeOfDay: str(f.timeOfDay, 100),
      dressCode: str(f.dressCode, 200), colorTheme: str(f.colorTheme, 200), venueNotes: str(f.venueNotes), note: str(f.note),
      order: typeof f.order === 'number' ? f.order : 0,
    };
  });
  const slots: Slot[] = list('slots').map((s) => {
    owned(s, 'slot');
    return {
      id: s.id as string, planId: s.planId as string, name: str(s.name, 200) || 'Slot', hint: str(s.hint, 200), optional: s.optional === true,
      order: typeof s.order === 'number' ? s.order : 0, hiddenIn: Array.isArray(s.hiddenIn) ? s.hiddenIn.filter(isId) : [],
    };
  });
  const items: Item[] = list('items').map((i) => {
    owned(i, 'item');
    return {
      id: i.id as string, planId: i.planId as string, title: str(i.title, 300) || 'Untitled', link: safeUrl(i.link), imageUrl: safeUrl(i.imageUrl),
      photoId: isId(i.photoId) ? i.photoId : '', note: str(i.note), price: typeof i.price === 'number' && i.price > 0 ? i.price : null,
      currency: str(i.currency, 3) || 'INR', status: (STATUSES as readonly string[]).includes(i.status as string) ? (i.status as Item['status']) : 'Idea',
      createdAt: typeof i.createdAt === 'number' ? i.createdAt : Date.now(),
    };
  });
  const fnIds = new Set(functions.map((f) => f.id));
  const slotIds = new Set(slots.map((s) => s.id));
  const itemIds = new Set(items.map((i) => i.id));
  const placements: Placement[] = list('placements').map((p) => {
    owned(p, 'placement');
    if (!itemIds.has(p.itemId as string) || !fnIds.has(p.functionId as string) || !slotIds.has(p.slotId as string)) {
      throw new BackupError('invalid', 'A placement refers to a missing record');
    }
    return {
      id: p.id as string, planId: p.planId as string, itemId: p.itemId as string, functionId: p.functionId as string, slotId: p.slotId as string,
      picked: p.picked === true, order: typeof p.order === 'number' ? p.order : 0,
    };
  });
  const presets: Preset[] = (Array.isArray(data.presets) ? data.presets : [])
    .filter((p: Record<string, unknown>) => ['women', 'men', 'custom'].includes(p?.id as string) && Array.isArray(p.slots))
    .map((p: Record<string, unknown>) => ({
      id: p.id as Preset['id'], label: str(p.label, 50),
      slots: (p.slots as Record<string, unknown>[]).map((s) => ({ name: str(s?.name, 200) || 'Slot', hint: str(s?.hint, 200), optional: s?.optional === true })),
    }));

  const photoIds = new Set(items.map((i) => i.photoId).filter(Boolean));
  const photos = Object.entries(entries)
    .map(([name, buf]) => {
      const m = /^photos\/([^/]+)\/(full|thumb)\.(jpg|png|webp)$/.exec(name);
      if (!m || !photoIds.has(m[1])) return null;
      const type = m[3] === 'png' ? 'image/png' : m[3] === 'webp' ? 'image/webp' : 'image/jpeg';
      const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      return { photoId: m[1], size: m[2] as 'full' | 'thumb', type, data };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  return {
    snapshot: { plans, functions, slots, items, placements, photos, presets, meta: [] },
    planTitles: plans.map((p) => p.title),
  };
}

/**
 * Writes a parsed backup with fresh ids in one transaction. Returns a function
 * that undoes the whole restore (for the 6 s toast).
 */
export async function applyBackup(parsed: Snapshot, mode: 'replace' | 'keep'): Promise<() => Promise<void>> {
  return write(async () => {
    const before = mode === 'replace' ? await collect('all') : null;
    if (before) await removeSnapshot(before);
    const existingTitles = new Set((await db.plans.toArray()).map((p) => p.title));
    const { remapped } = remapBundle({ ...parsed, presets: [], meta: [] });
    remapped.plans = remapped.plans.map((p) => (existingTitles.has(p.title) ? { ...p, title: `Copy of ${p.title}` } : p));
    await restoreSnapshot(remapped);
    if (mode === 'replace' && parsed.presets.length) await db.presets.bulkPut(parsed.presets);
    return async () => {
      await write(async () => {
        await removeSnapshot(remapped);
        if (before) await restoreSnapshot(before);
      });
    };
  });
}
