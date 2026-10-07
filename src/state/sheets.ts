import { useSyncExternalStore } from 'react';

// One overlay at a time. Opening a sheet replaces the current one.
export type SheetState =
  | { kind: 'capture'; planId: string; target?: { functionId: string; slotId: string } }
  | { kind: 'place'; planId: string; itemId: string; justCaptured?: boolean; addOnly?: boolean }
  | { kind: 'planDetails'; planId: string }
  | { kind: 'item'; planId: string; itemId: string; placementId?: string }
  | { kind: 'share'; planId: string; functionId?: string }
  | { kind: 'menu'; planId?: string }
  | { kind: 'useExisting'; planId: string; functionId: string; slotId: string }
  | { kind: 'slots'; planId: string; functionId: string }
  | { kind: 'confirm'; title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void | Promise<void> }
  | { kind: 'restore'; file: File }
  | { kind: 'viewer'; files: File[]; title: string };

let sheet: SheetState | null = null;
let returnFocus: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function openSheet(next: SheetState) {
  if (!sheet) returnFocus = document.activeElement as HTMLElement | null;
  sheet = next;
  listeners.forEach((l) => l());
}

export function closeSheet() {
  sheet = null;
  listeners.forEach((l) => l());
  const el = returnFocus;
  returnFocus = null;
  // Focus returns to the control that opened the overlay (DR15).
  if (el && document.contains(el)) requestAnimationFrame(() => el.focus());
}

export function useSheet(): SheetState | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sheet,
  );
}
