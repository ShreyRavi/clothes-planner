import type { Fn, Item, Placement, Slot } from './types';

export function slotsForFunction(slots: Slot[], fnId: string): Slot[] {
  return slots.filter((s) => !s.hiddenIn.includes(fnId)).sort((a, b) => a.order - b.order);
}

export interface SlotState {
  slot: Slot;
  placements: Placement[];
  picked: Placement | undefined;
}

export function slotStates(slots: Slot[], placements: Placement[], fnId: string): SlotState[] {
  return slotsForFunction(slots, fnId).map((slot) => {
    const ps = placements.filter((p) => p.functionId === fnId && p.slotId === slot.id).sort((a, b) => a.order - b.order);
    return { slot, placements: ps, picked: ps.find((p) => p.picked) };
  });
}

/** "6 of 9": required, visible slots with a picked item (VW-1). */
export function completeness(slots: Slot[], placements: Placement[], fnId: string) {
  const states = slotStates(slots, placements, fnId).filter((s) => !s.slot.optional);
  const done = states.filter((s) => s.picked).length;
  return { done, total: states.length, missing: states.filter((s) => !s.picked).map((s) => s.slot) };
}

export function pickedItems(fn: Fn, slots: Slot[], placements: Placement[], items: Item[]): Item[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return slotStates(slots, placements, fn.id)
    .map((s) => (s.picked ? byId.get(s.picked.itemId) : undefined))
    .filter((x): x is Item => !!x);
}

const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

/** "2026-06-23" -> "Tue, Jun 23" */
export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : fmt.format(d);
}

export function formatPrice(price: number | null, currency: string): string {
  if (price == null) return '';
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

/** VW-3: totals of picked items, per currency. */
export function budget(items: Item[], placements: Placement[]): Array<{ currency: string; total: number }> {
  const pickedIds = new Set(placements.filter((p) => p.picked).map((p) => p.itemId));
  const totals = new Map<string, number>();
  for (const it of items) {
    if (pickedIds.has(it.id) && it.price != null) totals.set(it.currency, (totals.get(it.currency) ?? 0) + it.price);
  }
  return [...totals].map(([currency, total]) => ({ currency, total }));
}
