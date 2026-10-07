import { expect, test } from '@playwright/test';
import { PHOTO, createWeddingPlan, freshApp, openFunction } from './helpers';

test.beforeEach(async ({ page }) => {
  await freshApp(page);
});

async function addPickedPhoto(page: import('@playwright/test').Page) {
  await openFunction(page, 'Mehendi');
  await page.getByRole('button', { name: 'Add to Main outfit' }).click();
  await page.getByLabel('Choose from photo library').setInputFiles(PHOTO);
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /Tap to pick/ }).click();
}

test('SH-0: share images through the share sheet when file sharing works', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __shared: number }).__shared = 0;
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: async (d: ShareData) => {
        (window as unknown as { __shared: number }).__shared = d.files?.length ?? 0;
      },
      configurable: true,
    });
  });
  await page.reload();
  await createWeddingPlan(page);
  await addPickedPhoto(page);
  await page.getByRole('button', { name: 'Share this function' }).click();
  const send = page.getByRole('button', { name: /^Send 1 image$/ });
  await expect(send).toBeEnabled({ timeout: 15_000 });
  await send.click();
  await expect(page.getByText('Shared Mehendi')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __shared: number }).__shared)).toBe(1);
});

test('DR8: without file sharing a phone gets the Save to Photos viewer', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true });
  });
  await page.reload();
  await createWeddingPlan(page);
  await page.getByRole('link', { name: "Ananya's wedding" }).first().isVisible().catch(() => undefined);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const send = page.getByRole('button', { name: /^Send 6 images$/ });
  await expect(send).toBeEnabled({ timeout: 20_000 });
  await send.click();
  await expect(page.getByText('Press and hold the image, then Save to Photos')).toBeVisible();
  await expect(page.getByText('1 of 6')).toBeVisible();
});

test('SH-1 SH-2 SH-3: a share link round trips and can be saved as a copy', async ({ page, context }) => {
  await createWeddingPlan(page);
  await addPickedPhoto(page);
  await page.getByRole('button', { name: 'Share this function' }).click();
  await page.getByRole('button', { name: 'Send as link' }).click();
  await expect(page.getByText(/1 photo from your phone won't appear in the link/)).toBeVisible();
  const url = await page.getByLabel('Share link').inputValue();
  expect(url).toContain('/s/#');
  const viewer = await context.newPage();
  await viewer.goto(url);
  await expect(viewer.getByRole('heading', { name: "Ananya's wedding" })).toBeVisible();
  await expect(viewer.getByText(/Shared on/)).toBeVisible();
  await expect(viewer.getByRole('heading', { name: 'Mehendi' })).toBeVisible();
  await viewer.getByRole('button', { name: 'Save a copy' }).click();
  await expect(viewer.getByRole('heading', { name: "Copy of Ananya's wedding" })).toBeVisible();
  await expect(viewer.getByText(/Saved from a link shared on/)).toBeVisible();
});

test('DR9: a cut-off link shows the plain-language screen', async ({ page }) => {
  await page.goto('./s/#AQ3Lsc0K');
  await expect(page.getByRole('heading', { name: "This plan can't be opened" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start your own plan' })).toBeVisible();
});

test('D4: a crafted javascript link never becomes an href', async ({ page }) => {
  // [plan],[fn],[slot],[item with javascript: link],[placement picked]
  const data = await page.evaluate(async () => {
    const payload = JSON.stringify([['Evil'], [['F']], [['S']], [['Click me', 'javascript:alert(1)']], [[0, 0, 0, 1]], '2026-01-01']);
    const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const body = new Uint8Array(await new Response(stream).arrayBuffer());
    const bytes = new Uint8Array(body.length + 1);
    bytes[0] = 1;
    bytes.set(body, 1);
    let s = '';
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  });
  await page.goto(`./s/#${data}`);
  await expect(page.getByText('Click me').first()).toBeVisible();
  await expect(page.locator('a[href^="javascript"]')).toHaveCount(0);
});
