// Theme lives in Settings only, default System (design review DR18).
export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'trousseau:theme';

export function getTheme(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePref = getTheme()) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
}

export function setTheme(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage blocked: the choice lasts for this session */
  }
  applyTheme(pref);
}

const LAST_PLAN = 'trousseau:lastPlan';
export function getLastPlan(): string | null {
  try {
    return localStorage.getItem(LAST_PLAN);
  } catch {
    return null;
  }
}
export function setLastPlan(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_PLAN, id);
    else localStorage.removeItem(LAST_PLAN);
  } catch {
    /* ignore */
  }
}
