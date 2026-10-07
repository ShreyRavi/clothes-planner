import { deflateSync, Inflate, strToU8, strFromU8 } from 'fflate';
import { fromBase64Url, toBase64Url } from './base64url';
import { newId } from '../domain/ids';
import { safeUrl } from '../domain/safeUrl';
import { STATUSES, type Fn, type Item, type Placement, type Plan, type PlanBundle, type PresetId, type Slot } from '../domain/types';
import type { Snapshot } from '../db/undo';

// Share link wire format v1 (eng review D7). See codec/FORMAT.md.
// [plan, functions[], slots[], items[], placements[], sharedOn] as positional
// arrays with trailing defaults dropped, references by index, no ids.
// Bytes: [version][deflate-raw(JSON)] -> base64url, placed in the URL fragment.

export const FORMAT_VERSION = 1;
export const MAX_DECODED_BYTES = 2 * 1024 * 1024;
export const LINK_TARGET_CHARS = 6000;
export const LINK_WARN_CHARS = 8000;

export type CodecErrorReason = 'empty' | 'truncated' | 'too-large' | 'version' | 'invalid';
export class CodecError extends Error {
  constructor(public reason: CodecErrorReason, detail = '') {
    super(detail || reason);
  }
}

const PRESETS: PresetId[] = ['women', 'men', 'custom'];

function trim(row: unknown[]): unknown[] {
  let end = row.length;
  while (end > 0) {
    const v = row[end - 1];
    if (v === '' || v === 0 || v === null || v === undefined || v === false || (Array.isArray(v) && v.length === 0)) end--;
    else break;
  }
  return row.slice(0, end);
}

export interface EncodeOptions {
  functionIds?: string[]; // SH-4: share only these functions
  sharedOn?: string; // ISO date shown on the read-only view
}

export interface EncodeResult {
  data: string;
  localPhotosLeftOut: number;
}

export function encodePlan(bundle: PlanBundle, opts: EncodeOptions = {}): EncodeResult {
  const fns = [...bundle.functions]
    .filter((f) => !opts.functionIds || opts.functionIds.includes(f.id))
    .sort((a, b) => a.order - b.order);
  const slots = [...bundle.slots].sort((a, b) => a.order - b.order);
  const fnIdx = new Map(fns.map((f, i) => [f.id, i]));
  const slotIdx = new Map(slots.map((s, i) => [s.id, i]));
  const placements = bundle.placements
    .filter((p) => fnIdx.has(p.functionId) && slotIdx.has(p.slotId))
    .sort((a, b) => a.order - b.order);
  const usedItemIds = new Set(placements.map((p) => p.itemId));
  const items = bundle.items.filter((i) => usedItemIds.has(i.id));
  const itemIdx = new Map(items.map((it, i) => [it.id, i]));

  const p = bundle.plan;
  const payload = [
    trim([p.title, p.owner, Math.max(0, PRESETS.indexOf(p.preset)), p.place, p.startDate, p.endDate, p.notes]),
    fns.map((f) => trim([f.name, f.date, f.timeOfDay, f.dressCode, f.colorTheme, f.venueNotes, f.note])),
    slots.map((s) => trim([s.name, s.optional ? 1 : 0, s.hint, s.hiddenIn.map((id) => fnIdx.get(id)).filter((i) => i !== undefined)])),
    items.map((it) =>
      trim([it.title, safeUrl(it.link), safeUrl(it.imageUrl), it.note, it.price ?? 0, it.currency === 'INR' ? '' : it.currency, STATUSES.indexOf(it.status)]),
    ),
    placements.map((pl) => trim([itemIdx.get(pl.itemId), fnIdx.get(pl.functionId), slotIdx.get(pl.slotId), pl.picked ? 1 : 0])),
    opts.sharedOn ?? new Date().toISOString().slice(0, 10),
  ];
  const json = strToU8(JSON.stringify(payload));
  const body = deflateSync(json, { level: 9 });
  const bytes = new Uint8Array(body.length + 1);
  bytes[0] = FORMAT_VERSION;
  bytes.set(body, 1);
  const localPhotosLeftOut = items.filter((it) => it.photoId && !safeUrl(it.imageUrl)).length;
  return { data: toBase64Url(bytes), localPhotosLeftOut };
}

function inflateCapped(bytes: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  let done = false;
  const inf = new Inflate((chunk, final) => {
    total += chunk.length;
    if (total > MAX_DECODED_BYTES) throw new CodecError('too-large', `Decoded size exceeds ${MAX_DECODED_BYTES} bytes`);
    chunks.push(chunk);
    if (final) done = true;
  });
  try {
    inf.push(bytes, true);
  } catch (e) {
    if (e instanceof CodecError) throw e;
    throw new CodecError('truncated', 'Compressed data is incomplete or damaged');
  }
  if (!done) throw new CodecError('truncated', 'Compressed data ended early');
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export interface DecodedShare {
  snapshot: Snapshot; // fresh ids, ready to view or save (eng review D6)
  sharedOn: string;
}

export function decodePlan(data: string): DecodedShare {
  const text = data.trim().replace(/^#/, '');
  if (!text) throw new CodecError('empty', 'No plan data in the link');
  const bytes = fromBase64Url(text);
  if (!bytes || bytes.length < 2) throw new CodecError('truncated', 'Link data is not valid');
  if (bytes[0] !== FORMAT_VERSION) {
    throw new CodecError('version', bytes[0] > FORMAT_VERSION ? 'Made with a newer version of Trousseau' : `Unknown format version ${bytes[0]}`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(strFromU8(inflateCapped(bytes.subarray(1))));
  } catch (e) {
    if (e instanceof CodecError) throw e;
    throw new CodecError('truncated', 'Link data could not be read');
  }
  return { snapshot: payloadToSnapshot(payload), sharedOn: str(arr(payload)[5], 10) };
}

function payloadToSnapshot(payload: unknown): Snapshot {
  if (!Array.isArray(payload) || payload.length < 5) throw new CodecError('invalid', 'Plan data has the wrong shape');
  const [rawPlan, rawFns, rawSlots, rawItems, rawPlacements] = payload as unknown[][];
  if (!Array.isArray(rawPlan) || ![rawFns, rawSlots, rawItems, rawPlacements].every(Array.isArray)) {
    throw new CodecError('invalid', 'Plan data has the wrong shape');
  }
  if (rawFns.length > 200 || rawSlots.length > 200 || rawItems.length > 5000 || rawPlacements.length > 20000) {
    throw new CodecError('too-large', 'Plan has too many records');
  }
  const now = Date.now();
  const planId = newId();
  const plan: Plan = {
    id: planId,
    title: str(rawPlan[0], 200) || 'Shared plan',
    owner: str(rawPlan[1], 200),
    preset: PRESETS[num(rawPlan[2])] ?? 'custom',
    templateId: 'shared',
    place: str(rawPlan[3], 200),
    startDate: str(rawPlan[4], 10),
    endDate: str(rawPlan[5], 10),
    notes: str(rawPlan[6]),
    createdAt: now,
    updatedAt: now,
  };
  const functions: Fn[] = rawFns.map((r, i) => {
    const f = arr(r);
    return {
      id: newId(), planId, name: str(f[0], 200) || `Function ${i + 1}`, date: str(f[1], 10), timeOfDay: str(f[2], 100),
      dressCode: str(f[3], 200), colorTheme: str(f[4], 200), venueNotes: str(f[5]), note: str(f[6]), order: i,
    };
  });
  const slots: Slot[] = rawSlots.map((r, i) => {
    const s = arr(r);
    return {
      id: newId(), planId, name: str(s[0], 200) || `Slot ${i + 1}`, optional: num(s[1]) === 1, hint: str(s[2], 200), order: i,
      hiddenIn: arr(s[3]).map((k) => functions[num(k)]?.id).filter((x): x is string => !!x),
    };
  });
  const items: Item[] = rawItems.map((r) => {
    const it = arr(r);
    const price = num(it[4]);
    return {
      id: newId(), planId, title: str(it[0], 300) || 'Untitled', link: safeUrl(it[1]), imageUrl: safeUrl(it[2]), photoId: '',
      note: str(it[3]), price: price > 0 ? price : null, currency: str(it[5], 3) || 'INR',
      status: STATUSES[num(it[6])] ?? 'Idea', createdAt: now,
    };
  });
  const placements: Placement[] = [];
  rawPlacements.forEach((r, i) => {
    const p = arr(r);
    const item = items[num(p[0])];
    const fn = functions[num(p[1])];
    const slot = slots[num(p[2])];
    if (!item || !fn || !slot) throw new CodecError('invalid', 'Plan data refers to missing records');
    placements.push({ id: newId(), planId, itemId: item.id, functionId: fn.id, slotId: slot.id, picked: num(p[3]) === 1, order: i });
  });
  return { plans: [plan], functions, slots, items, placements, photos: [], presets: [], meta: [] };
}

/** Builds the full share URL for this deployment: <origin><base>s/#<data>. */
export function shareUrl(data: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}s/#${data}`;
}
