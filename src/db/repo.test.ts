import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDb } from './schema';
import {
  addFunction, addSlot, createPlan, deleteRoot, duplicatePlan, ensurePresets, getLastUsed, getPreset, moveItemTo, placeItem,
  restore, savePreset, setSlotHiddenIn, togglePick, blankItem, addPlacementTx,
} from './repo';
import { write } from './write';
import { templateById } from '../domain/templates';
import { getUiState, clearSaveError } from '../state/store';

async function newPlan() {
  await ensurePresets();
  const t = templateById('indian-wedding')!;
  return createPlan({ title: 'Wedding', owner: 'Priya', preset: 'women', templateId: t.id, functions: t.functions });
}

async function addItemTo(planId: string, fnIndex = 0, slotIndex = 0, title = 'Juttis') {
  const fns = await db.functions.where('planId').equals(planId).sortBy('order');
  const slots = await db.slots.where('planId').equals(planId).sortBy('order');
  return write(async () => {
    const item = blankItem(planId, { title });
    await db.items.add(item);
    const p = await addPlacementTx(planId, item.id, fns[fnIndex].id, slots[slotIndex].id);
    return { item, placement: p, fn: fns[fnIndex], slot: slots[slotIndex] };
  });
}

beforeEach(() => {
  resetDb();
  clearSaveError();
});

describe('plans (PL-1, PL-3)', () => {
  it('creates a plan from a template with preset slots (PL-1, SL-1)', async () => {
    const id = await newPlan();
    expect(await db.functions.where('planId').equals(id).count()).toBe(5);
    expect(await db.slots.where('planId').equals(id).count()).toBe(13);
  });

  it('duplicates a plan with fresh ids and an independent copy (PL-3)', async () => {
    const id = await newPlan();
    await addItemTo(id);
    const copy = await duplicatePlan(id);
    expect(copy).not.toBe(id);
    expect((await db.plans.get(copy))!.title).toBe('Copy of Wedding');
    expect(await db.placements.where('planId').equals(copy).count()).toBe(1);
    const copiedFnIds = (await db.functions.where('planId').equals(copy).toArray()).map((f) => f.id);
    const origFnIds = (await db.functions.where('planId').equals(id).toArray()).map((f) => f.id);
    expect(copiedFnIds.some((x) => origFnIds.includes(x))).toBe(false);
  });
});

describe('placements and picks (IT-5, IT-6, IT-7)', () => {
  it('allows one picked candidate per function and slot', async () => {
    const id = await newPlan();
    const a = await addItemTo(id, 0, 0, 'A');
    const b = await addItemTo(id, 0, 0, 'B');
    await togglePick(a.placement.id);
    await togglePick(b.placement.id);
    const rows = await db.placements.where('[functionId+slotId]').equals([a.fn.id, a.slot.id]).toArray();
    expect(rows.filter((r) => r.picked).map((r) => r.id)).toEqual([b.placement.id]);
    await togglePick(b.placement.id);
    expect((await db.placements.get(b.placement.id))!.picked).toBe(false);
  });

  it('reuses one item across functions as a reference, sharing status (IT-6)', async () => {
    const id = await newPlan();
    const { item, slot } = await addItemTo(id, 0, 3, 'Gold juttis');
    const fns = await db.functions.where('planId').equals(id).sortBy('order');
    await placeItem(item.id, fns[2].id, slot.id);
    expect(await db.placements.where('itemId').equals(item.id).count()).toBe(2);
    expect(await db.items.where('planId').equals(id).count()).toBe(1);
    expect(await getLastUsed(id)).toEqual({ functionId: fns[2].id, slotId: slot.id });
  });

  it('treats an item with no placement as Inbox, and can move it in and out (IT-7)', async () => {
    const id = await newPlan();
    const { item, fn, slot } = await addItemTo(id);
    await moveItemTo(item.id, null);
    expect(await db.placements.where('itemId').equals(item.id).count()).toBe(0);
    await moveItemTo(item.id, { functionId: fn.id, slotId: slot.id });
    expect(await db.placements.where('itemId').equals(item.id).count()).toBe(1);
  });

  it('hides a slot for one function only (SL-3)', async () => {
    const id = await newPlan();
    const { fn, slot } = await addItemTo(id);
    await setSlotHiddenIn(slot.id, fn.id, true);
    expect((await db.slots.get(slot.id))!.hiddenIn).toEqual([fn.id]);
    const only = await addSlot(id, 'Mehendi gloves', fn.id);
    expect((await db.slots.get(only))!.hiddenIn).toHaveLength(4);
  });
});

describe('undo (eng D8)', () => {
  it('restores a deleted plan with every row and the same ids', async () => {
    const id = await newPlan();
    await addItemTo(id);
    await db.photos.put({ photoId: 'ph1', size: 'full', type: 'image/jpeg', data: new Uint8Array([1]).buffer });
    const item = (await db.items.where('planId').equals(id).first())!;
    await db.items.update(item.id, { photoId: 'ph1' });
    const before = await Promise.all([db.functions.count(), db.slots.count(), db.items.count(), db.placements.count(), db.photos.count()]);
    const snap = await deleteRoot('plan', id);
    expect(await db.plans.count()).toBe(0);
    expect(await db.placements.count()).toBe(0);
    expect(await db.photos.count()).toBe(0);
    await restore(snap);
    const after = await Promise.all([db.functions.count(), db.slots.count(), db.items.count(), db.placements.count(), db.photos.count()]);
    expect(after).toEqual(before);
    expect(await db.plans.get(id)).toBeTruthy();
  });

  it('cascades a function delete to its placements only', async () => {
    const id = await newPlan();
    const { fn, item } = await addItemTo(id);
    await deleteRoot('function', fn.id);
    expect(await db.placements.count()).toBe(0);
    expect(await db.items.get(item.id)).toBeTruthy();
  });

  it('delete all data and undo restores presets and meta', async () => {
    await newPlan();
    const snap = await deleteRoot('all');
    expect(await db.presets.count()).toBe(0);
    await restore(snap);
    expect(await db.presets.count()).toBe(3);
    expect(await db.plans.count()).toBe(1);
  });
});

describe('presets (eng D1)', () => {
  it('edits apply to new plans only', async () => {
    const id = await newPlan();
    const p = await getPreset('women');
    p.slots = [{ name: 'Only slot', hint: '', optional: false }];
    await savePreset(p);
    expect(await db.slots.where('planId').equals(id).count()).toBe(13);
    const t = templateById('blank')!;
    const id2 = await createPlan({ title: 'B', owner: '', preset: 'women', templateId: t.id, functions: [] });
    expect((await db.slots.where('planId').equals(id2).toArray()).map((s) => s.name)).toEqual(['Only slot']);
  });
});

describe('write path (eng D12)', () => {
  it('reports a failed write with a retry and leaves no partial rows', async () => {
    const id = await newPlan();
    await expect(
      write(async () => {
        await addFunction(id, 'never');
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }),
    ).rejects.toThrow();
    expect(getUiState().saveError?.message).toMatch(/out of space/);
    expect(typeof getUiState().saveError?.retry).toBe('function');
    expect(await db.functions.where('planId').equals(id).count()).toBe(5);
  });

  it('counts edits for the backup nudge', async () => {
    const id = await newPlan();
    await addFunction(id, 'Cocktail night');
    const row = await db.meta.get('editsSinceBackup');
    expect(row!.value).toBeGreaterThanOrEqual(2);
  });
});
