import { describe, expect, it } from 'vitest';
import { H, layoutFunction, layoutOverview, rowsFor, W, fitHeading, type TileInput } from './layout';

// Deterministic fake: every character is 0.5em wide.
const measure = (text: string, font: string) => text.length * Number(/(\d+)px/.exec(font)![1]) * 0.5;
const tiles = (n: number): TileInput[] => Array.from({ length: n }, (_, i) => ({ slotName: `Slot ${i}`, title: `Item ${i}`, domain: '', imageKey: '', picked: true }));

describe('share image layout (DR2, SH-0)', () => {
  it('fits a hero plus 8 pieces on one 1080x1920 image', () => {
    const pages = layoutFunction('Mehendi', 'Tue, Jun 23', tiles(9), measure);
    expect(pages).toHaveLength(1);
    expect(pages[0].tiles[0].hero).toBe(true);
    for (const t of pages[0].tiles) {
      expect(t.x + t.w).toBeLessThanOrEqual(W);
      expect(t.y + t.h).toBeLessThanOrEqual(H - 100);
    }
  });

  it('spills a 10th piece onto a second image labeled 2 of 2', () => {
    const pages = layoutFunction('Mehendi', '', tiles(10), measure);
    expect(pages).toHaveLength(2);
    expect(pages[1].pageLabel).toBe(', 2 of 2');
    expect(pages[1].tiles).toHaveLength(1);
  });

  it('a two-line heading drops capacity to hero plus 5 (DR20)', () => {
    const one = layoutFunction('Mehendi', '', tiles(20), measure);
    const two = layoutFunction('Wedding ceremony and pheras at dawn', '', tiles(20), measure);
    expect(two[0].heading.lines.length).toBe(2);
    expect(rowsFor(two[0].headerHeight)).toBe(3);
    expect(two[0].tiles).toHaveLength(6);
    expect(one[0].tiles).toHaveLength(9);
  });

  it('wraps, then shrinks, then truncates long names (DR20)', () => {
    const long = 'Sangeet night at the Lake Palace with the whole extended family and friends';
    const fit = fitHeading(long, [96, 72], W - 112, measure);
    expect(fit.size).toBe(72);
    expect(fit.lines).toHaveLength(2);
    expect(fit.lines[1].endsWith('…')).toBe(true);
    const word = fitHeading('Supercalifragilisticexpialidocious', [96, 72], W - 112, measure);
    expect(word.lines.length).toBeLessThanOrEqual(2);
  });
});

describe('overview contact sheet (DR3)', () => {
  it('fits 9 functions on one image, then continues', () => {
    const fns = Array.from({ length: 10 }, (_, i) => ({ name: `Function ${i}`, meta: '', imageKey: '' }));
    const pages = layoutOverview('Wedding', '', fns, measure);
    expect(pages).toHaveLength(2);
    expect(pages[0].cells).toHaveLength(9);
    const last = pages[0].cells[8];
    expect(last.y + 296 + 96).toBeLessThan(H - 100);
  });
});
