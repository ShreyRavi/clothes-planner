import { beforeEach, describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { db, resetDb } from '../db/schema';
import { createPlan, ensurePresets, blankItem, addPlacementTx } from '../db/repo';
import { write } from '../db/write';
import { applyBackup, buildBackup, parseBackup, BackupError, MAX_PHOTOS } from './backup';
import { templateById } from '../domain/templates';

async function seed() {
  await ensurePresets();
  const t = templateById('indian-wedding')!;
  const id = await createPlan({ title: 'Wedding', owner: 'Priya', preset: 'women', templateId: t.id, functions: t.functions });
  const fn = (await db.functions.where('planId').equals(id).first())!;
  const slot = (await db.slots.where('planId').equals(id).first())!;
  await write(async () => {
    const item = blankItem(id, { title: 'Lehenga', photoId: 'ph1', link: 'https://shop.com/x' });
    await db.items.add(item);
    await db.photos.bulkPut([
      { photoId: 'ph1', size: 'full', type: 'image/jpeg', data: new Uint8Array([1, 2, 3]).buffer },
      { photoId: 'ph1', size: 'thumb', type: 'image/jpeg', data: new Uint8Array([4]).buffer },
    ]);
    await addPlacementTx(id, item.id, fn.id, slot.id);
  });
  return id;
}

async function reasonOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e instanceof BackupError ? e.reason : 'other';
  }
  return 'none';
}

beforeEach(() => {
  resetDb();
});

describe('backup and restore (ST-2, ST-3)', () => {
  it('round trips everything including local photos', async () => {
    await seed();
    const { blob, photoCount } = await buildBackup();
    expect(photoCount).toBe(2);
    const { snapshot } = await parseBackup(blob);
    expect(snapshot.plans).toHaveLength(1);
    expect(snapshot.photos).toHaveLength(2);
    expect(snapshot.items[0].link).toBe('https://shop.com/x');
    const full = snapshot.photos.find((p) => p.size === 'full')!;
    expect(Array.from(new Uint8Array(full.data))).toEqual([1, 2, 3]);
  });

  it('keep both: importing the same backup twice gives independent plans (eng D6)', async () => {
    await seed();
    const { blob } = await buildBackup();
    const { snapshot } = await parseBackup(blob);
    await applyBackup(snapshot, 'keep');
    await applyBackup(snapshot, 'keep');
    const plans = await db.plans.toArray();
    expect(plans).toHaveLength(3);
    expect(new Set(plans.map((p) => p.id)).size).toBe(3);
    expect(plans.filter((p) => p.title.startsWith('Copy of'))).toHaveLength(2);
    expect(await db.photos.count()).toBe(6);
  });

  it('replace removes current plans and undo brings them back', async () => {
    const original = await seed();
    const { blob } = await buildBackup();
    const { snapshot } = await parseBackup(blob);
    const undo = await applyBackup(snapshot, 'replace');
    expect(await db.plans.get(original)).toBeUndefined();
    expect(await db.plans.count()).toBe(1);
    await undo();
    expect(await db.plans.get(original)).toBeTruthy();
    expect(await db.plans.count()).toBe(1);
  });

  it('rejects non-backups, newer versions, too many photos and dangling references', async () => {
    expect(await reasonOf(parseBackup(new Blob(['hello'])))).toBe('not-backup');
    const mk = (data: object, extra: Record<string, Uint8Array> = {}) =>
      new Blob([zipSync({ 'data.json': strToU8(JSON.stringify(data)), ...extra }) as BlobPart]);
    const base = { format: 'trousseau-backup', version: 1, plans: [], functions: [], slots: [], items: [], placements: [] };
    expect(await reasonOf(parseBackup(mk({ ...base, version: 7 })))).toBe('version');
    expect(await reasonOf(parseBackup(mk({ format: 'other' })))).toBe('not-backup');
    const photos: Record<string, Uint8Array> = {};
    for (let i = 0; i <= MAX_PHOTOS; i++) photos[`photos/p${i}/thumb.jpg`] = new Uint8Array(1);
    expect(await reasonOf(parseBackup(mk(base, photos)))).toBe('too-large');
    const dangling = { ...base, plans: [{ id: 'p', title: 'x' }], placements: [{ id: 'q', planId: 'p', itemId: 'nope', functionId: 'f', slotId: 's' }] };
    expect(await reasonOf(parseBackup(mk(dangling)))).toBe('invalid');
    expect(await db.plans.count()).toBe(0);
  });

  it('sanitizes unsafe URLs in a backup (eng D4)', async () => {
    const data = {
      format: 'trousseau-backup', version: 1, plans: [{ id: 'p', title: 'x' }], functions: [], slots: [], placements: [],
      items: [{ id: 'i', planId: 'p', title: 't', link: 'javascript:alert(1)', imageUrl: 'data:x' }],
    };
    const { snapshot } = await parseBackup(new Blob([zipSync({ 'data.json': strToU8(JSON.stringify(data)) }) as BlobPart]));
    expect(snapshot.items[0].link).toBe('');
    expect(snapshot.items[0].imageUrl).toBe('');
  });
});
