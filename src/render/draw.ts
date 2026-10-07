import { FONT, GRID_X, H, MARGIN, TILE, W, ellipsize, type FunctionPage, type OverviewPage } from './layout';

// Canvas drawing for share images. Always the light palette (DR17).
const C = { bg: '#F6F2EB', surface: '#FFFDF9', soft: '#EEE7DC', line: '#E2D9CC', ink: '#221C17', muted: '#6B6158', accent: '#A93A22' };

export type ImageResolver = (key: string, large: boolean) => Promise<CanvasImageSource | null>;

let fontsReady: Promise<void> | null = null;
/** Explicitly loads the canvas faces; falls back to system fonts on failure. */
export function loadFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = Promise.all([
      document.fonts.load(FONT.serif(96)),
      document.fonts.load(FONT.sans(34)),
      document.fonts.load(FONT.sans(28, 600)),
    ])
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsReady;
}

export function measureWith(ctx: CanvasRenderingContext2D) {
  return (text: string, font: string) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
}

export function newCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const iw = (img as { width: number }).width;
  const ih = (img as { height: number }).height;
  const k = Math.max(w / iw, h / ih);
  const sw = w / k;
  const sh = h / k;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

function drawHeader(ctx: CanvasRenderingContext2D, heading: { size: number; lines: string[] }, label: string, meta: string) {
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = FONT.serif(heading.size);
  const lh = Math.round(heading.size * 1.08);
  heading.lines.forEach((line, i) => {
    const text = i === heading.lines.length - 1 ? line + label : line;
    ctx.fillText(text, MARGIN, MARGIN + lh * (i + 1) - Math.round(heading.size * 0.2));
  });
  ctx.fillStyle = C.muted;
  ctx.font = FONT.sans(34);
  const y = MARGIN + lh * heading.lines.length + 16 + 34;
  ctx.fillText(ellipsize(meta, W - MARGIN * 2, (t) => ctx.measureText(t).width), MARGIN, y);
}

function drawFooter(ctx: CanvasRenderingContext2D, footer: string) {
  ctx.fillStyle = C.muted;
  ctx.font = FONT.sans(28);
  ctx.fillText(footer, MARGIN, H - MARGIN);
}

function drawFallbackTile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, domain: string) {
  rounded(ctx, x, y, w, h, 10);
  ctx.fillStyle = C.soft;
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.font = FONT.sans(30, 600);
  const lines = title ? [ellipsize(title, w - 40, (t) => ctx.measureText(t).width)] : [];
  lines.forEach((l, i) => ctx.fillText(l, x + 20, y + h / 2 + i * 36));
  if (domain) {
    ctx.fillStyle = C.muted;
    ctx.font = FONT.sans(26);
    ctx.fillText(ellipsize(domain, w - 40, (t) => ctx.measureText(t).width), x + 20, y + h / 2 + 40);
  }
}

function drawEmptyTile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string) {
  ctx.save();
  rounded(ctx, x + 1, y + 1, w - 2, h - 2, 10);
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.line;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = C.muted;
  ctx.font = FONT.sans(30);
  const t = ellipsize(text, w - 40, (s) => ctx.measureText(s).width);
  ctx.fillText(t, x + (w - ctx.measureText(t).width) / 2, y + h / 2 + 10);
}

async function drawPhotoTile(
  ctx: CanvasRenderingContext2D,
  resolve: ImageResolver,
  t: { x: number; y: number; w: number; h: number; imageKey: string; title: string; domain: string; hero?: boolean },
) {
  const img = t.imageKey ? await resolve(t.imageKey, !!t.hero) : null;
  if (img) {
    ctx.save();
    rounded(ctx, t.x, t.y, t.w, t.h, 10);
    ctx.clip();
    ctx.fillStyle = C.soft;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    drawCover(ctx, img, t.x, t.y, t.w, t.h);
    ctx.restore();
  } else {
    drawFallbackTile(ctx, t.x, t.y, t.w, t.h, t.title, t.domain);
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png'));
}

export async function drawFunctionPage(page: FunctionPage, resolve: ImageResolver, footer: string): Promise<Blob> {
  const { canvas, ctx } = newCanvas();
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, page.heading, page.pageLabel, page.meta);
  for (const t of page.tiles) {
    if (!t.picked) drawEmptyTile(ctx, t.x, t.y, t.w, t.h, 'Not picked yet');
    else await drawPhotoTile(ctx, resolve, t);
    const capY = t.y + t.h;
    ctx.fillStyle = C.muted;
    ctx.font = FONT.sans(24, 600);
    ctx.fillText(ellipsize(t.slotName.toUpperCase(), t.w, (s) => ctx.measureText(s).width), t.x, capY + 32);
    if (t.picked && t.title) {
      ctx.fillStyle = C.ink;
      ctx.font = FONT.sans(30);
      ctx.fillText(ellipsize(t.title, t.w, (s) => ctx.measureText(s).width), t.x, capY + 66);
    }
  }
  drawFooter(ctx, footer);
  return toBlob(canvas);
}

export async function drawOverviewPage(page: OverviewPage, resolve: ImageResolver, footer: string): Promise<Blob> {
  const { canvas, ctx } = newCanvas();
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, page.heading, page.pageLabel, page.meta);
  for (const cell of page.cells) {
    if (cell.imageKey) await drawPhotoTile(ctx, resolve, { x: cell.x, y: cell.y, w: TILE, h: TILE, imageKey: cell.imageKey, title: cell.name, domain: '' });
    else drawEmptyTile(ctx, cell.x, cell.y, TILE, TILE, cell.name);
    ctx.fillStyle = C.ink;
    ctx.font = FONT.serif(40);
    cell.captionLines.forEach((l, i) => ctx.fillText(l, cell.x, cell.y + TILE + 44 + i * 42));
    ctx.fillStyle = C.muted;
    ctx.font = FONT.sans(26);
    ctx.fillText(ellipsize(cell.meta, TILE, (s) => ctx.measureText(s).width), cell.x, cell.y + TILE + 44 + cell.captionLines.length * 42 + 6);
  }
  if (!page.cells.length) {
    ctx.fillStyle = C.muted;
    ctx.font = FONT.sans(34);
    ctx.fillText('No functions yet', GRID_X, page.headerHeight + 40);
  }
  drawFooter(ctx, footer);
  return toBlob(canvas);
}
