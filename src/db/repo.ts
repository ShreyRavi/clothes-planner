import { db } from './schema';
import { write } from './write';
import { collect, removeSnapshot, restoreSnapshot, type RootKind, type Snapshot } from './undo';
import { newId } from '../domain/ids';
import { DEFAULT_PRESETS, PRESET_IDS } from '../domain/presets';
import type { Fn, Item, Placement, Plan, Preset, PresetId, Slot, Status } from '../domain/types';
import type { TemplateFn } from '../domain/templates';

// ---------- presets (Settings, eng review D1) ----------

export async function ensurePresets() {
  const count = await db.presets.count();
  if (count >= PRESET_IDS.length) return;
  await write(async () => {
    for (const id of PRESET_IDS) {
      if (!(await db.presets.get(id))) await db.presets.put(structuredClone(DEFAULT_PRESETS[id]));
    }
  }, { countsAsEdit: false });
}

export async function getPreset(id: PresetId): Promise<Preset> {
  return (await db.presets.get(id)) ?? structuredClone(DEFAULT_PRESETS[id]);
}

export function savePreset(preset: Preset) {
  return write(() => db.presets.put(preset), { countsAsEdit: false });
}

// ---------- plans ----------

export interface NewPlanInput {
  title: string;
  owner: string;
  preset: PresetId;
  templateId: string;
  functions: TemplateFn[];
}

export async function createPlan(input: NewPlanInput): Promise<string> {
  const preset = await getPreset(input.preset);
  return write(async () => {
    const now = Date.now();
    const plan: Plan = {
      id: newId(),
      title: input.title.trim() || 'My outfits',
      owner: input.owner.trim(),
      preset: input.preset,
      templateId: input.templateId,
      place: '',
      startDate: '',
      endDate: '',
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    await db.plans.add(plan);
    await db.functions.bulkAdd(
      input.functions.map((f, i) => ({
        id: newId(), planId: plan.id, name: f.name, date: '', timeOfDay: f.timeOfDay, dressCode: f.dressCode,
        colorTheme: '', venueNotes: '', note: '', order: i,
      })),
    );
    await db.slots.bulkAdd(
      preset.slots.map((s, i) => ({ id: newId(), planId: plan.id, name: s.name, hint: s.hint, optional: s.optional, order: i, hiddenIn: [] })),
    );
    return plan.id;
  });
}

export function updatePlan(id: string, patch: Partial<Plan>) {
  return write(() => db.plans.update(id, { ...patch, updatedAt: Date.now() }));
}

async function touch(planId: string) {
  await db.plans.update(planId, { updatedAt: Date.now() });
}

/** PL-3: a full, independent copy with fresh ids. */
export function duplicatePlan(id: string): Promise<string> {
  return write(async () => {
    const snap = await collect('plan', id);
    const { remapped } = remapBundle(snap, `Copy of ${snap.plans[0]?.title ?? 'plan'}`);
    await restoreSnapshot(remapped);
    return remapped.plans[0].id;
  });
}

/** Rewrites every id and reference in a snapshot (eng review D6). */
export function remapBundle(snap: Snapshot, newTitle?: string): { remapped: Snapshot; map: Map<string, string> } {
  const map = new Map<string, string>();
  const fresh = (old: string) => {
    if (!old) return old;
    let n = map.get(old);
    if (!n) {
      n = newId();
      map.set(old, n);
    }
    return n;
  };
  const now = Date.now();
  const remapped: Snapshot = {
    plans: snap.plans.map((p) => ({ ...p, id: fresh(p.id), title: newTitle ?? p.title, createdAt: now, updatedAt: now })),
    functions: snap.functions.map((f) => ({ ...f, id: fresh(f.id), planId: fresh(f.planId) })),
    slots: snap.slots.map((s) => ({ ...s, id: fresh(s.id), planId: fresh(s.planId), hiddenIn: s.hiddenIn.map(fresh) })),
    items: snap.items.map((i) => ({ ...i, id: fresh(i.id), planId: fresh(i.planId), photoId: fresh(i.photoId) })),
    placements: snap.placements.map((p) => ({
      ...p, id: fresh(p.id), planId: fresh(p.planId), itemId: fresh(p.itemId), functionId: fresh(p.functionId), slotId: fresh(p.slotId),
    })),
    photos: snap.photos.map((ph) => ({ ...ph, photoId: fresh(ph.photoId) })),
    presets: [],
    meta: [],
  };
  return { remapped, map };
}

// ---------- functions ----------

export function addFunction(planId: string, name: string): Promise<string> {
  return write(async () => {
    const fns = await db.functions.where('planId').equals(planId).toArray();
    const id = newId();
    await db.functions.add({
      id, planId, name: name.trim() || 'New function', date: '', timeOfDay: '', dressCode: '', colorTheme: '', venueNotes: '', note: '',
      order: fns.length ? Math.max(...fns.map((f) => f.order)) + 1 : 0,
    });
    await touch(planId);
    return id;
  });
}

export function updateFunction(id: string, patch: Partial<Fn>) {
  return write(async () => {
    await db.functions.update(id, patch);
    const fn = await db.functions.get(id);
    if (fn) await touch(fn.planId);
  });
}

async function moveInList<T extends { id: string; order: number }>(list: T[], id: string, dir: -1 | 1, save: (rows: T[]) => Promise<unknown>) {
  const sorted = [...list].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sorted.length) return;
  [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  await save(sorted.map((r, k) => ({ ...r, order: k })));
}

export function moveFunction(planId: string, id: string, dir: -1 | 1) {
  return write(async () => {
    const fns = await db.functions.where('planId').equals(planId).toArray();
    await moveInList(fns, id, dir, (rows) => db.functions.bulkPut(rows));
  });
}

// ---------- slots ----------

export function addSlot(planId: string, name: string, onlyFunctionId?: string): Promise<string> {
  return write(async () => {
    const slots = await db.slots.where('planId').equals(planId).toArray();
    const fns = onlyFunctionId ? await db.functions.where('planId').equals(planId).toArray() : [];
    const id = newId();
    await db.slots.add({
      id, planId, name: name.trim() || 'New slot', hint: '', optional: false,
      order: slots.length ? Math.max(...slots.map((s) => s.order)) + 1 : 0,
      hiddenIn: onlyFunctionId ? fns.filter((f) => f.id !== onlyFunctionId).map((f) => f.id) : [],
    });
    return id;
  });
}

export function updateSlot(id: string, patch: Partial<Slot>) {
  return write(() => db.slots.update(id, patch));
}

export function moveSlot(planId: string, id: string, dir: -1 | 1) {
  return write(async () => {
    const slots = await db.slots.where('planId').equals(planId).toArray();
    await moveInList(slots, id, dir, (rows) => db.slots.bulkPut(rows));
  });
}

/** SL-3: hide or show one slot for one function only. */
export function setSlotHiddenIn(slotId: string, functionId: string, hidden: boolean) {
  return write(async () => {
    const slot = await db.slots.get(slotId);
    if (!slot) return;
    const set = new Set(slot.hiddenIn);
    if (hidden) set.add(functionId);
    else set.delete(functionId);
    await db.slots.update(slotId, { hiddenIn: [...set] });
  });
}

// ---------- items and placements ----------

export interface NewItemInput {
  title?: string;
  link?: string;
  imageUrl?: string;
  photoId?: string;
  note?: string;
}

export function blankItem(planId: string, input: NewItemInput): Item {
  return {
    id: newId(), planId, title: input.title?.trim() || 'Untitled', link: input.link ?? '', imageUrl: input.imageUrl ?? '',
    photoId: input.photoId ?? '', note: input.note ?? '', price: null, currency: 'INR', status: 'Idea', createdAt: Date.now(),
  };
}

/** Must run inside a write() transaction. */
export async function addPlacementTx(planId: string, itemId: string, functionId: string, slotId: string): Promise<Placement> {
  const existing = await db.placements.where('[functionId+slotId]').equals([functionId, slotId]).toArray();
  const dup = existing.find((p) => p.itemId === itemId);
  if (dup) return dup;
  const p: Placement = {
    id: newId(), planId, itemId, functionId, slotId, picked: false,
    order: existing.length ? Math.max(...existing.map((e) => e.order)) + 1 : 0,
  };
  await db.placements.add(p);
  return p;
}

export function placeItem(itemId: string, functionId: string, slotId: string) {
  return write(async () => {
    const item = await db.items.get(itemId);
    if (!item) return;
    await addPlacementTx(item.planId, itemId, functionId, slotId);
    await setLastUsedTx(item.planId, functionId, slotId);
    await touch(item.planId);
  });
}

/** Moves a just-captured item: replaces its only placement (or Inbox) with a new target. */
export function moveItemTo(itemId: string, target: { functionId: string; slotId: string } | null) {
  return write(async () => {
    const item = await db.items.get(itemId);
    if (!item) return;
    const current = await db.placements.where('itemId').equals(itemId).toArray();
    await db.placements.bulkDelete(current.map((p) => p.id));
    if (target) {
      await addPlacementTx(item.planId, itemId, target.functionId, target.slotId);
      await setLastUsedTx(item.planId, target.functionId, target.slotId);
    }
  });
}

export function updateItem(id: string, patch: Partial<Item>) {
  return write(async () => {
    await db.items.update(id, patch);
  });
}

export function setStatus(itemId: string, status: Status) {
  return updateItem(itemId, { status });
}

/** Picking one candidate unpicks the others in the same function and slot (IT-5). */
export function togglePick(placementId: string) {
  return write(async () => {
    const p = await db.placements.get(placementId);
    if (!p) return;
    const next = !p.picked;
    if (next) {
      const siblings = await db.placements.where('[functionId+slotId]').equals([p.functionId, p.slotId]).toArray();
      await db.placements.bulkPut(siblings.map((s) => ({ ...s, picked: s.id === p.id })));
    } else {
      await db.placements.update(p.id, { picked: false });
    }
    await touch(p.planId);
  });
}

// ---------- meta ----------

export async function setLastUsedTx(planId: string, functionId: string, slotId: string) {
  await db.meta.put({ key: `lastUsed:${planId}`, value: { functionId, slotId } });
}

export async function getLastUsed(planId: string): Promise<{ functionId: string; slotId: string } | null> {
  const row = await db.meta.get(`lastUsed:${planId}`);
  const v = row?.value as { functionId: string; slotId: string } | undefined;
  if (!v) return null;
  const [fn, slot] = await Promise.all([db.functions.get(v.functionId), db.slots.get(v.slotId)]);
  return fn && slot ? v : null;
}

export async function markBackedUp() {
  await write(async () => {
    await db.meta.put({ key: 'lastBackupAt', value: Date.now() });
    await db.meta.put({ key: 'editsSinceBackup', value: 0 });
    await db.meta.delete('firstEditSinceBackup');
  }, { countsAsEdit: false });
}

// ---------- deletes with undo ----------

export function deleteRoot(kind: RootKind, id = ''): Promise<Snapshot> {
  return write(async () => {
    const snap = await collect(kind, id);
    await removeSnapshot(snap);
    return snap;
  });
}

export function restore(snap: Snapshot) {
  return write(() => restoreSnapshot(snap));
}
