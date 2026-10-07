import { useSyncExternalStore } from 'react';

// Tiny app-wide UI state: toast, save failure, and per-session flags.
// Plan data lives in IndexedDB and is read with live queries, never here.

export interface Toast {
  id: number;
  message: string;
  undo?: () => Promise<void> | void;
  actionLabel: string;
  duration: number;
}

interface UiState {
  toast: Toast | null;
  saveError: { message: string; retry?: () => Promise<unknown> } | null;
}

let state: UiState = { toast: null, saveError: null };
const listeners = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let toastSeq = 0;

function set(patch: Partial<UiState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useUi<T>(select: (s: UiState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => select(state),
  );
}

export const UNDO_MS = 6000;
export const INFO_MS = 2600;

export function showToast(message: string, undo?: Toast['undo'], actionLabel = 'Undo') {
  clearTimeout(toastTimer);
  const toast: Toast = { id: ++toastSeq, message, undo, actionLabel, duration: undo ? UNDO_MS : INFO_MS };
  set({ toast });
  toastTimer = setTimeout(() => {
    if (state.toast?.id === toast.id) set({ toast: null });
  }, toast.duration);
}

export function dismissToast() {
  clearTimeout(toastTimer);
  set({ toast: null });
}

export function reportSaveError(_error: unknown, retry?: () => Promise<unknown>) {
  set({ saveError: { message: "Couldn't save your last change. Your phone may be out of space.", retry } });
}

export function clearSaveError() {
  set({ saveError: null });
}

export function getUiState() {
  return state;
}
