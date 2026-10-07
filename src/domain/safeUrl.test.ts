import { describe, expect, it } from 'vitest';
import { cleanUrl, hostOf, looksLikeUrl, safeUrl, siteName } from './safeUrl';

describe('safeUrl (eng D4)', () => {
  it.each([
    ['https://www.myntra.com/x', 'https://www.myntra.com/x'],
    ['  http://example.com/a?b=1  ', 'http://example.com/a?b=1'],
  ])('keeps web URLs: %s', (input, out) => expect(safeUrl(input)).toBe(out));

  it.each(['javascript:alert(1)', ' JaVaScRiPt:alert(1)', '\tjavascript:alert(1)', 'data:text/html,<script>x</script>', 'vbscript:x', 'file:///etc/passwd', 'not a url', '', null, 42])(
    'rejects %s',
    (input) => expect(safeUrl(input)).toBe(''),
  );
});

describe('cleanUrl and site names (IT-1)', () => {
  it('strips tracking parameters but keeps real ones', () => {
    expect(cleanUrl('https://shop.com/p?id=4&utm_source=ig&fbclid=abc&gclid=1')).toBe('https://shop.com/p?id=4');
  });
  it('derives a site name for the default title', () => {
    expect(siteName('https://www.myntra.com/lehenga/1')).toBe('Myntra');
    expect(siteName('https://www.tanishq.co.in/p')).toBe('Tanishq');
    expect(hostOf('https://www.ajio.com/x')).toBe('ajio.com');
  });
  it('detects pasted URLs', () => {
    expect(looksLikeUrl('https://a.com/x')).toBe(true);
    expect(looksLikeUrl('just text')).toBe(false);
  });
});
