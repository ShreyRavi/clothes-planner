// Pure layout for share images (design review DR2, DR3, DR20). Drawing lives in
// draw.ts; this file only decides what goes where, so it can be unit tested.

export const W = 1080;
export const H = 1920;
export const MARGIN = 56;
export const TILE = 296;
export const GAP = 24;
export const CAPTION = 72;
export const ROW_GAP = 16;
export const ROW = TILE + CAPTION + ROW_GAP; // 384
export const GRID_X = (W - (TILE * 3 + GAP * 2)) / 2; // 72
export const FOOTER_ZONE = 100;

export type Measure = (text: string, font: string) => number;

export const FONT = {
  serif: (px: number) => `400 ${px}px Newsreader, Georgia, serif`,
  sans: (px: number, weight = 400) => `${weight} ${px}px "Instrument Sans", system-ui, sans-serif`,
};

/** Wrap to at most 2 lines at full size, then one step smaller, then ellipsis (DR20). */
export function fitHeading(text: string, sizes: number[], maxWidth: number, measure: Measure, family = FONT.serif): { size: number; lines: string[] } {
  for (const size of sizes) {
    const lines = wrap(text, maxWidth, (t) => measure(t, family(size)));
    if (lines.length <= 2) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  const lines = wrap(text, maxWidth, (t) => measure(t, family(size)));
  return { size, lines: [lines[0], ellipsize(lines.slice(1).join(' '), maxWidth, (t) => measure(t, family(size)))] };
}

export function wrap(text: string, maxWidth: number, width: (t: string) => number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (width(next) <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  // A single word wider than the line gets broken by characters.
  return lines.flatMap((l) => (width(l) <= maxWidth ? [l] : breakWord(l, maxWidth, width)));
}

function breakWord(word: string, maxWidth: number, width: (t: string) => number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of word) {
    if (width(cur + ch) > maxWidth && cur) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function ellipsize(text: string, maxWidth: number, width: (t: string) => number): string {
  if (width(text) <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (width(text.slice(0, mid).trimEnd() + '…') <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + '…';
}

// ---------- per-function image ----------

export interface TileInput {
  slotName: string;
  title: string; // '' when nothing is picked
  domain: string;
  imageKey: string; // opaque key the drawer resolves to an image, '' when none
  picked: boolean;
}

export interface PlacedTile extends TileInput {
  x: number;
  y: number;
  w: number;
  h: number; // photo height; caption sits below
  hero: boolean;
}

export interface FunctionPage {
  heading: { size: number; lines: string[] };
  meta: string;
  headerHeight: number;
  pageLabel: string; // '' or ', 2 of 2'
  tiles: PlacedTile[];
}

function headerHeight(lines: number, size: number) {
  return MARGIN + lines * Math.round(size * 1.08) + 16 + 44 + 40;
}

export function rowsFor(headerH: number): number {
  return Math.max(1, Math.floor((H - FOOTER_ZONE - headerH) / ROW));
}

/** Lays out tiles across pages. The first tile is the hero (2x2) on page 1 (DR2). */
export function layoutFunction(name: string, meta: string, tiles: TileInput[], measure: Measure): FunctionPage[] {
  const heading = fitHeading(name, [96, 72], W - MARGIN * 2, measure);
  const headerH = headerHeight(heading.lines.length, heading.size);
  const rows = rowsFor(headerH);
  const pages: PlacedTile[][] = [];
  let rest = [...tiles];
  // Page 1: hero occupies columns 0-1 of the first two rows.
  const first: PlacedTile[] = [];
  if (rest.length) {
    const cells: Array<[number, number]> = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) if (!(r < 2 && c < 2)) cells.push([r, c]);
    const hero = rest.shift()!;
    const heroH = rows >= 2 ? TILE * 2 + CAPTION + ROW_GAP : TILE;
    first.push({ ...hero, x: GRID_X, y: headerH, w: TILE * 2 + GAP, h: heroH, hero: true });
    for (const [r, c] of cells) {
      const t = rest.shift();
      if (!t) break;
      first.push({ ...t, x: GRID_X + c * (TILE + GAP), y: headerH + r * ROW, w: TILE, h: TILE, hero: false });
    }
  }
  pages.push(first);
  while (rest.length) {
    const page: PlacedTile[] = [];
    for (let r = 0; r < rows && rest.length; r++) {
      for (let c = 0; c < 3 && rest.length; c++) {
        const t = rest.shift()!;
        page.push({ ...t, x: GRID_X + c * (TILE + GAP), y: headerH + r * ROW, w: TILE, h: TILE, hero: false });
      }
    }
    pages.push(page);
  }
  return pages.map((p, i) => ({
    heading,
    meta,
    headerHeight: headerH,
    pageLabel: pages.length > 1 ? `, ${i + 1} of ${pages.length}` : '',
    tiles: p,
  }));
}

// ---------- overview image ----------

export interface OverviewInput {
  name: string;
  meta: string; // "Tue, Jun 23 · 6 of 9"
  imageKey: string;
}

export interface OverviewPage {
  heading: { size: number; lines: string[] };
  meta: string;
  headerHeight: number;
  pageLabel: string;
  cells: Array<OverviewInput & { x: number; y: number; captionLines: string[] }>;
}

export const OV_ROW = TILE + 96 + ROW_GAP;

export function layoutOverview(title: string, meta: string, fns: OverviewInput[], measure: Measure, perPage = 9): OverviewPage[] {
  const heading = fitHeading(title, [80, 60], W - MARGIN * 2, measure);
  const headerH = headerHeight(heading.lines.length, heading.size);
  const pages: OverviewInput[][] = [];
  for (let i = 0; i < Math.max(1, fns.length); i += perPage) pages.push(fns.slice(i, i + perPage));
  return pages.map((list, pi) => ({
    heading,
    meta,
    headerHeight: headerH,
    pageLabel: pages.length > 1 ? `, ${pi + 1} of ${pages.length}` : '',
    cells: list.map((f, i) => {
      const r = Math.floor(i / 3);
      const c = i % 3;
      const lines = wrap(f.name, TILE, (t) => measure(t, FONT.serif(40)));
      const captionLines = lines.length <= 2 ? lines : [lines[0], ellipsize(lines.slice(1).join(' '), TILE, (t) => measure(t, FONT.serif(40)))];
      return { ...f, x: GRID_X + c * (TILE + GAP), y: headerH + r * OV_ROW, captionLines };
    }),
  }));
}
