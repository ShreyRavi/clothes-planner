import { describe, expect, it } from 'vitest';
import { deflateSync, strToU8 } from 'fflate';
import { CodecError, decodePlan, encodePlan, LINK_TARGET_CHARS } from './codec';
import { toBase64Url, fromBase64Url } from './base64url';
import { bigPlan } from '../test/fixtures';

function reasonOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return e instanceof CodecError ? e.reason : 'other';
  }
  return 'none';
}

describe('base64url', () => {
  it('round trips every length', () => {
    for (let n = 0; n < 40; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 255);
      expect(Array.from(fromBase64Url(toBase64Url(bytes))!)).toEqual(Array.from(bytes));
    }
  });
  it('rejects foreign characters', () => expect(fromBase64Url('ab+/')).toBeNull());
});

describe('share codec SH-1 round trip', () => {
  it('round trips a 60-item plan with fresh ids and no local photos', () => {
    const src = bigPlan();
    const { data, localPhotosLeftOut } = encodePlan(src, { sharedOn: '2026-10-06' });
    const { snapshot, sharedOn } = decodePlan(data);
    expect(sharedOn).toBe('2026-10-06');
    expect(snapshot.plans[0].title).toBe(src.plan.title);
    expect(snapshot.plans[0].id).not.toBe(src.plan.id);
    expect(snapshot.functions.map((f) => f.name)).toEqual(src.functions.map((f) => f.name));
    expect(snapshot.items).toHaveLength(60);
    expect(snapshot.placements).toHaveLength(60);
    expect(snapshot.placements.filter((p) => p.picked)).toHaveLength(30);
    expect(snapshot.items.every((i) => i.photoId === '')).toBe(true);
    expect(localPhotosLeftOut).toBe(20);
    const item = snapshot.items.find((i) => i.title.startsWith('Mint chikankari anarkali 0'))!;
    expect(item.link).toContain('myntra.com');
    expect(item.status).toBe('Idea');
  });

  it('shares a single function only (SH-4)', () => {
    const src = bigPlan();
    const { data } = encodePlan(src, { functionIds: ['f2'] });
    const { snapshot } = decodePlan(data);
    expect(snapshot.functions.map((f) => f.name)).toEqual(['Sangeet']);
    expect(snapshot.items).toHaveLength(10);
  });

  it('keeps a typical plan under the link budget', () => {
    const { data } = encodePlan(bigPlan(6, 60));
    // Report the real size so the budget decision has data (design doc OQ1).
    console.info(`60-item link: ${data.length} chars (target ${LINK_TARGET_CHARS})`);
    expect(data.length).toBeLessThan(LINK_TARGET_CHARS);
  });

  it('strips unsafe URLs at decode (eng D4)', () => {
    const src = bigPlan(1, 1);
    src.items[0].link = 'javascript:alert(1)';
    src.items[0].imageUrl = 'data:image/png;base64,AAAA';
    // Bypass encode-side cleaning by hand-building the payload.
    const payload = [['T'], [['F']], [['S']], [['x', 'javascript:alert(1)', 'data:x', '', 0, '', 0]], [[0, 0, 0, 1]], '2026-01-01'];
    const body = deflateSync(strToU8(JSON.stringify(payload)));
    const bytes = new Uint8Array(body.length + 1);
    bytes[0] = 1;
    bytes.set(body, 1);
    const { snapshot } = decodePlan(toBase64Url(bytes));
    expect(snapshot.items[0].link).toBe('');
    expect(snapshot.items[0].imageUrl).toBe('');
  });
});

describe('codec rejects bad input (eng D5)', () => {
  const good = encodePlan(bigPlan()).data;
  it('truncated link', () => expect(reasonOf(() => decodePlan(good.slice(0, Math.floor(good.length / 2))))).toBe('truncated'));
  it('empty link', () => expect(reasonOf(() => decodePlan(''))).toBe('empty'));
  it('newer version', () => {
    const bytes = fromBase64Url(good)!;
    bytes[0] = 9;
    expect(reasonOf(() => decodePlan(toBase64Url(bytes)))).toBe('version');
  });
  it('decompression bomb over 2 MB', () => {
    const huge = strToU8(JSON.stringify([['x'.repeat(3 * 1024 * 1024)], [], [], [], []]));
    const body = deflateSync(huge, { level: 9 });
    const bytes = new Uint8Array(body.length + 1);
    bytes[0] = 1;
    bytes.set(body, 1);
    expect(reasonOf(() => decodePlan(toBase64Url(bytes)))).toBe('too-large');
  });
  it('dangling index', () => {
    const payload = [['T'], [['F']], [['S']], [], [[5, 0, 0, 1]], '2026-01-01'];
    const body = deflateSync(strToU8(JSON.stringify(payload)));
    const bytes = new Uint8Array(body.length + 1);
    bytes[0] = 1;
    bytes.set(body, 1);
    expect(reasonOf(() => decodePlan(toBase64Url(bytes)))).toBe('invalid');
  });
  it('wrong shape', () => {
    const body = deflateSync(strToU8(JSON.stringify({ hello: 1 })));
    const bytes = new Uint8Array(body.length + 1);
    bytes[0] = 1;
    bytes.set(body, 1);
    expect(reasonOf(() => decodePlan(toBase64Url(bytes)))).toBe('invalid');
  });
});
