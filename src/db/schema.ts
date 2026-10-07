import Dexie, { type Table } from 'dexie';
import type { Fn, Item, MetaRow, PhotoRow, Placement, Plan, Preset, Slot } from '../domain/types';

export class TrousseauDB extends Dexie {
  plans!: Table<Plan, string>;
  functions!: Table<Fn, string>;
  slots!: Table<Slot, string>;
  items!: Table<Item, string>;
  placements!: Table<Placement, string>;
  photos!: Table<PhotoRow, [string, string]>;
  presets!: Table<Preset, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'trousseau') {
    super(name);
    // Schema v1. Every later change adds a this.version(n).stores(...).upgrade(...)
    // and a fixture in src/db/fixtures so old data keeps opening.
    this.version(1).stores({
      plans: 'id, updatedAt',
      functions: 'id, planId, order',
      slots: 'id, planId, order',
      items: 'id, planId, photoId',
      placements: 'id, planId, itemId, functionId, slotId, [functionId+slotId]',
      photos: '[photoId+size], photoId',
      presets: 'id',
      meta: 'key',
    });
  }
}

export const SCHEMA_VERSION = 1;
export let db = new TrousseauDB();

/** Tests swap in a fresh database. */
export function resetDb(name = `test-${Math.random()}`) {
  db = new TrousseauDB(name);
  return db;
}

export function allTables() {
  return [db.plans, db.functions, db.slots, db.items, db.placements, db.photos, db.presets, db.meta];
}
