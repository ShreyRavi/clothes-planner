import { db } from './schema';
import type { Fn, Item, MetaRow, PhotoRow, Placement, Plan, Preset, Slot } from '../domain/types';

// One undo mechanism for every destructive action (eng review D8): collect the
// root and its cascade, delete it, and hand back a snapshot that puts the very
// same rows (same ids) back.

export interface Snapshot {
  plans: Plan[];
  functions: Fn[];
  slots: Slot[];
  items: Item[];
  placements: Placement[];
  photos: PhotoRow[];
  presets: Preset[];
  meta: MetaRow[];
}

export type RootKind = 'plan' | 'function' | 'slot' | 'item' | 'placement' | 'all';

const empty = (): Snapshot => ({ plans: [], functions: [], slots: [], items: [], placements: [], photos: [], presets: [], meta: [] });

async function photosFor(items: Item[]): Promise<PhotoRow[]> {
  const ids = items.map((i) => i.photoId).filter(Boolean);
  if (!ids.length) return [];
  return db.photos.where('photoId').anyOf(ids).toArray();
}

/** Must run inside a write() transaction. */
export async function collect(kind: RootKind, id = ''): Promise<Snapshot> {
  const snap = empty();
  switch (kind) {
    case 'plan': {
      const plan = await db.plans.get(id);
      if (!plan) return snap;
      snap.plans = [plan];
      snap.functions = await db.functions.where('planId').equals(id).toArray();
      snap.slots = await db.slots.where('planId').equals(id).toArray();
      snap.items = await db.items.where('planId').equals(id).toArray();
      snap.placements = await db.placements.where('planId').equals(id).toArray();
      snap.photos = await photosFor(snap.items);
      break;
    }
    case 'function': {
      const fn = await db.functions.get(id);
      if (!fn) return snap;
      snap.functions = [fn];
      snap.placements = await db.placements.where('functionId').equals(id).toArray();
      break;
    }
    case 'slot': {
      const slot = await db.slots.get(id);
      if (!slot) return snap;
      snap.slots = [slot];
      snap.placements = await db.placements.where('slotId').equals(id).toArray();
      break;
    }
    case 'item': {
      const item = await db.items.get(id);
      if (!item) return snap;
      snap.items = [item];
      snap.placements = await db.placements.where('itemId').equals(id).toArray();
      snap.photos = await photosFor([item]);
      break;
    }
    case 'placement': {
      const p = await db.placements.get(id);
      if (p) snap.placements = [p];
      break;
    }
    case 'all': {
      snap.plans = await db.plans.toArray();
      snap.functions = await db.functions.toArray();
      snap.slots = await db.slots.toArray();
      snap.items = await db.items.toArray();
      snap.placements = await db.placements.toArray();
      snap.photos = await db.photos.toArray();
      snap.presets = await db.presets.toArray();
      snap.meta = await db.meta.toArray();
      break;
    }
  }
  return snap;
}

/** Must run inside a write() transaction. */
export async function removeSnapshot(snap: Snapshot) {
  await db.plans.bulkDelete(snap.plans.map((r) => r.id));
  await db.functions.bulkDelete(snap.functions.map((r) => r.id));
  await db.slots.bulkDelete(snap.slots.map((r) => r.id));
  await db.items.bulkDelete(snap.items.map((r) => r.id));
  await db.placements.bulkDelete(snap.placements.map((r) => r.id));
  await db.photos.bulkDelete(snap.photos.map((r) => [r.photoId, r.size] as [string, string]));
  await db.presets.bulkDelete(snap.presets.map((r) => r.id));
  await db.meta.bulkDelete(snap.meta.map((r) => r.key));
}

/** Must run inside a write() transaction. */
export async function restoreSnapshot(snap: Snapshot) {
  await db.plans.bulkPut(snap.plans);
  await db.functions.bulkPut(snap.functions);
  await db.slots.bulkPut(snap.slots);
  await db.items.bulkPut(snap.items);
  await db.placements.bulkPut(snap.placements);
  await db.photos.bulkPut(snap.photos);
  await db.presets.bulkPut(snap.presets);
  await db.meta.bulkPut(snap.meta);
}

export function snapshotSize(snap: Snapshot): number {
  return Object.values(snap).reduce((n, rows) => n + rows.length, 0);
}
