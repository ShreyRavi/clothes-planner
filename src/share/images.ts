import { db } from '../db/schema';
import { getPhoto } from '../photos/capture';
import { completeness, formatDate, slotStates } from '../domain/stats';
import { hostOf, safeUrl } from '../domain/safeUrl';
import { layoutFunction, layoutOverview, type TileInput } from '../render/layout';
import { drawFunctionPage, drawOverviewPage, loadFonts, measureWith, newCanvas, type ImageResolver } from '../render/draw';
import { APP_NAME, appUrl } from '../config';
import type { Fn, Item, Placement, Slot } from '../domain/types';

export interface ShareJob {
  name: string; // file name and label
  render: () => Promise<Blob>;
}

function imageKey(item: Item | undefined): string {
  if (!item) return '';
  if (item.photoId) return `photo:${item.photoId}`;
  const url = safeUrl(item.imageUrl);
  return url ? `url:${url}` : '';
}

function makeResolver(): ImageResolver {
  const cache = new Map<string, Promise<CanvasImageSource | null>>();
  return (key, large) => {
    const k = `${key}|${large}`;
    let p = cache.get(k);
    if (!p) {
      p = (async () => {
        try {
          if (key.startsWith('photo:')) {
            const blob = await getPhoto(key.slice(6), large ? 'full' : 'thumb');
            if (!blob) return null;
            return await createImageBitmap(blob, { imageOrientation: 'from-image' });
          }
          if (key.startsWith('url:')) {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // without CORS the load fails and we draw the fallback tile
            img.src = key.slice(4);
            await img.decode();
            return img;
          }
        } catch {
          return null;
        }
        return null;
      })();
      cache.set(k, p);
    }
    return p;
  };
}

function fnMeta(fn: Fn): string {
  return [formatDate(fn.date), fn.timeOfDay, fn.dressCode].filter(Boolean).join(' · ');
}

function tilesFor(fn: Fn, slots: Slot[], placements: Placement[], items: Map<string, Item>): TileInput[] {
  return slotStates(slots, placements, fn.id)
    .filter((s) => !s.slot.optional || s.picked)
    .map((s) => {
      const item = s.picked ? items.get(s.picked.itemId) : undefined;
      return {
        slotName: s.slot.name, title: item?.title ?? '', domain: item ? hostOf(item.link) : '', imageKey: imageKey(item), picked: !!item,
      };
    });
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image';

/** Image jobs for a whole plan (overview first) or one function (SH-0). */
export async function planShareJobs(planId: string, functionId?: string): Promise<ShareJob[]> {
  const [plan, fns, slots, placements, itemList] = await Promise.all([
    db.plans.get(planId),
    db.functions.where('planId').equals(planId).sortBy('order'),
    db.slots.where('planId').equals(planId).toArray(),
    db.placements.where('planId').equals(planId).toArray(),
    db.items.where('planId').equals(planId).toArray(),
  ]);
  if (!plan) return [];
  await loadFonts();
  const items = new Map(itemList.map((i) => [i.id, i]));
  const { ctx } = newCanvas();
  const measure = measureWith(ctx);
  const resolve = makeResolver();
  const footer = `Made with ${APP_NAME} · ${appUrl()}`;
  const jobs: ShareJob[] = [];

  const chosen = functionId ? fns.filter((f) => f.id === functionId) : fns;
  if (!functionId) {
    const range = [formatDate(plan.startDate), formatDate(plan.endDate)].filter(Boolean).join(' to ');
    const meta = [plan.owner && `${plan.owner}'s outfits`, range].filter(Boolean).join(' · ');
    const cells = fns.map((fn) => {
      const first = slotStates(slots, placements, fn.id)[0];
      const item = first?.picked ? items.get(first.picked.itemId) : undefined;
      const c = completeness(slots, placements, fn.id);
      return { name: fn.name, meta: [formatDate(fn.date), `${c.done} of ${c.total}`].filter(Boolean).join(' · '), imageKey: imageKey(item) };
    });
    layoutOverview(plan.title, meta, cells, measure).forEach((page, i, all) => {
      jobs.push({ name: `${slug(plan.title)}-overview${all.length > 1 ? `-${i + 1}` : ''}.png`, render: () => drawOverviewPage(page, resolve, footer) });
    });
  }
  for (const fn of chosen) {
    const pages = layoutFunction(fn.name, fnMeta(fn), tilesFor(fn, slots, placements, items), measure);
    pages.forEach((page, i) => {
      jobs.push({ name: `${slug(fn.name)}${pages.length > 1 ? `-${i + 1}` : ''}.png`, render: () => drawFunctionPage(page, resolve, footer) });
    });
  }
  return jobs;
}
