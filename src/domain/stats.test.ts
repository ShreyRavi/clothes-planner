import { describe, expect, it } from 'vitest';
import { budget, completeness, formatDate, formatPrice } from './stats';
import type { Item, Placement, Slot } from './types';

const slot = (id: string, optional = false, hiddenIn: string[] = []): Slot => ({ id, planId: 'p', name: id, hint: '', optional, order: 0, hiddenIn });
const pl = (id: string, itemId: string, slotId: string, picked: boolean, functionId = 'f'): Placement => ({ id, planId: 'p', itemId, functionId, slotId, picked, order: 0 });

describe('completeness (VW-1)', () => {
  it('counts required visible slots with a pick, ignoring optional and hidden', () => {
    const slots = [slot('a'), slot('b'), slot('c', true), slot('d', false, ['f'])];
    const c = completeness(slots, [pl('1', 'i', 'a', true), pl('2', 'j', 'b', false), pl('3', 'k', 'c', true)], 'f');
    expect(c).toMatchObject({ done: 1, total: 2 });
    expect(c.missing.map((s) => s.id)).toEqual(['b']);
  });
});

describe('formatting and budget (VW-3)', () => {
  it('formats dates and prices', () => {
    expect(formatDate('2026-06-23')).toBe('Tue, Jun 23');
    expect(formatDate('')).toBe('');
    expect(formatPrice(38500, 'INR')).toMatch(/38,500/);
  });
  it('totals picked items per currency', () => {
    const items = [
      { id: 'i', price: 100, currency: 'INR' },
      { id: 'j', price: 50, currency: 'USD' },
      { id: 'k', price: 999, currency: 'INR' },
    ] as Item[];
    expect(budget(items, [pl('1', 'i', 'a', true), pl('2', 'j', 'b', true), pl('3', 'k', 'a', false)])).toEqual([
      { currency: 'INR', total: 100 },
      { currency: 'USD', total: 50 },
    ]);
  });
});
