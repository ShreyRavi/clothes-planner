import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { getPhoto } from '../photos/capture';
import type { Fn, Item, Placement, Plan, PhotoSize, Slot } from '../domain/types';

export interface PlanData {
  plan: Plan;
  functions: Fn[];
  slots: Slot[];
  items: Item[];
  placements: Placement[];
}

/** undefined while loading, null when the plan does not exist. */
export function usePlanData(planId: string | undefined): PlanData | null | undefined {
  return useLiveQuery(async () => {
    if (!planId) return null;
    const plan = await db.plans.get(planId);
    if (!plan) return null;
    const [functions, slots, items, placements] = await Promise.all([
      db.functions.where('planId').equals(planId).sortBy('order'),
      db.slots.where('planId').equals(planId).sortBy('order'),
      db.items.where('planId').equals(planId).toArray(),
      db.placements.where('planId').equals(planId).toArray(),
    ]);
    return { plan, functions, slots, items, placements };
  }, [planId]);
}

export function usePlans(): Plan[] | undefined {
  return useLiveQuery(() => db.plans.orderBy('updatedAt').reverse().toArray(), []);
}

export function useMeta<T>(key: string): T | undefined {
  return useLiveQuery(async () => (await db.meta.get(key))?.value as T | undefined, [key]);
}

// Object URLs for local photos, shared and revoked when unused (eng D10).
const urlCache = new Map<string, { url: string; refs: number }>();

export function usePhotoUrl(photoId: string, size: PhotoSize): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(() => (photoId ? urlCache.get(`${photoId}:${size}`)?.url : null));
  useEffect(() => {
    if (!photoId) {
      setUrl(null);
      return;
    }
    const key = `${photoId}:${size}`;
    let cancelled = false;
    let acquired = false;
    const hit = urlCache.get(key);
    if (hit) {
      hit.refs++;
      acquired = true;
      setUrl(hit.url);
    } else {
      getPhoto(photoId, size).then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setUrl(null);
          return;
        }
        const entry = urlCache.get(key) ?? { url: URL.createObjectURL(blob), refs: 0 };
        entry.refs++;
        urlCache.set(key, entry);
        acquired = true;
        setUrl(entry.url);
      });
    }
    return () => {
      cancelled = true;
      if (!acquired) return;
      const entry = urlCache.get(key);
      if (entry && --entry.refs <= 0) {
        // Delay so a quick remount (list reorders) reuses the URL.
        setTimeout(() => {
          const e = urlCache.get(key);
          if (e && e.refs <= 0) {
            URL.revokeObjectURL(e.url);
            urlCache.delete(key);
          }
        }, 2000);
      }
    };
  }, [photoId, size]);
  return url;
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}
