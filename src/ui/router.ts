import { useSyncExternalStore } from 'react';

// Hash routing keeps the app working on static hosting (GitHub Pages).
// Share links use a separate page (s/) whose fragment holds plan data.

function current(): string {
  const h = location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : `/${h}`;
}

export function useRoutePath(): string {
  return useSyncExternalStore(
    (cb) => {
      addEventListener('hashchange', cb);
      return () => removeEventListener('hashchange', cb);
    },
    current,
  );
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const url = `#${path}`;
  if (opts.replace) {
    history.replaceState(null, '', url);
    dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = path;
  }
}

export type Route =
  | { name: 'home' }
  | { name: 'setup'; template: string }
  | { name: 'plan'; planId: string }
  | { name: 'function'; planId: string; fnId: string }
  | { name: 'inbox'; planId: string }
  | { name: 'lists'; planId: string }
  | { name: 'print'; planId: string }
  | { name: 'settings' }
  | { name: 'preset'; presetId: string }
  | { name: 'notfound' };

export function parseRoute(path: string): Route {
  const [pathname, query = ''] = path.split('?');
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(query);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'new') return { name: 'setup', template: q.get('t') ?? 'indian-wedding' };
  if (parts[0] === 'settings') return parts[1] === 'preset' && parts[2] ? { name: 'preset', presetId: parts[2] } : { name: 'settings' };
  if (parts[0] === 'p' && parts[1]) {
    const planId = parts[1];
    if (!parts[2]) return { name: 'plan', planId };
    if (parts[2] === 'f' && parts[3]) return { name: 'function', planId, fnId: parts[3] };
    if (parts[2] === 'inbox') return { name: 'inbox', planId };
    if (parts[2] === 'lists') return { name: 'lists', planId };
    if (parts[2] === 'print') return { name: 'print', planId };
  }
  return { name: 'notfound' };
}
