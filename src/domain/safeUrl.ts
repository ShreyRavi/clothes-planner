// Untrusted links and image URLs (share links, backups, pastes) must never
// reach an href or src unless they are plain web addresses (eng review D4).
export function safeUrl(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return '';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  return url.href;
}

const TRACKING = /^(utm_[a-z]+|gclid|gbraid|wbraid|fbclid|igshid|igsh|mc_cid|mc_eid|si|ref_src|_ga|yclid|msclkid|spm|scm)$/i;

/** Drops tracking parameters so saved links stay short (PRD). */
export function cleanUrl(input: string): string {
  const safe = safeUrl(input);
  if (!safe) return '';
  const url = new URL(safe);
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.test(key)) url.searchParams.delete(key);
  }
  url.hash = url.hash === '#' ? '' : url.hash;
  return url.href;
}

export function hostOf(input: string): string {
  const safe = safeUrl(input);
  if (!safe) return '';
  return new URL(safe).hostname.replace(/^www\./, '');
}

/** "www.myntra.com" -> "Myntra"; the default title for a pasted link (IT-1). */
export function siteName(input: string): string {
  const host = hostOf(input);
  if (!host) return '';
  const parts = host.split('.');
  const core = parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2] ?? parts[0];
  return core.charAt(0).toUpperCase() + core.slice(1);
}

export function looksLikeUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}
