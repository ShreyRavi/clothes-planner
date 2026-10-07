import { expect, test } from '@playwright/test';
import { PHOTO, createWeddingPlan, freshApp, openFunction } from './helpers';

test.beforeEach(async ({ page }) => {
  await freshApp(page);
});

test('PL-1 VW-1: start a plan from the Indian wedding template', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Every outfit, for every function, in one place.' })).toBeVisible();
  await createWeddingPlan(page);
  for (const name of ['Mehendi', 'Haldi', 'Sangeet', 'Wedding ceremony', 'Reception']) {
    await expect(page.locator('.fn-card', { hasText: name })).toContainText('0 of 9');
  }
});

test('IT-2 IT-5: capture a photo into a slot in two taps, then pick it', async ({ page }) => {
  await createWeddingPlan(page);
  await openFunction(page, 'Mehendi');
  await page.getByRole('button', { name: 'Add to Main outfit' }).click();
  await page.getByLabel('Choose from photo library').setInputFiles(PHOTO);
  await expect(page.getByText('Saved to Mehendi, Main outfit')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  const tile = page.getByRole('button', { name: /Tap to pick/ });
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(page.getByText('1 of 9 picked')).toBeVisible();
  // The next capture lands in the last used slot without choosing (design doc capture speed).
  await page.getByRole('button', { name: 'Add an item' }).click();
  await page.getByLabel('Choose from photo library').setInputFiles(PHOTO);
  await expect(page.getByText('Saved to Mehendi, Main outfit')).toBeVisible();
});

test('IT-1 IT-7: a link with no last used slot goes to the Inbox, then gets placed', async ({ page }) => {
  await createWeddingPlan(page);
  await page.getByRole('button', { name: 'Add an item' }).click();
  await page.getByLabel('Product link').fill('https://www.myntra.com/lehenga/123?utm_source=ig');
  await page.getByRole('button', { name: 'Save' }).first().click();
  await expect(page.getByText('Saved to Inbox')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('link', { name: /1 item to place/ })).toBeVisible();
  await page.getByRole('link', { name: /1 item to place/ }).click();
  await expect(page.locator('.inbox-item', { hasText: 'Myntra' })).toBeVisible();
  await page.getByRole('button', { name: 'Place' }).click();
  await page.getByLabel('Slot').selectOption({ label: 'Footwear' });
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('heading', { name: 'All placed' })).toBeVisible();
});

test('paste anywhere creates an item, but not inside a text field', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not allow synthetic clipboardData');
  await createWeddingPlan(page);
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'https://www.ajio.com/bangles/p/42');
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  });
  await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: '+ Add function' }).click();
  const input = page.getByLabel('Function name');
  await input.focus();
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'https://example.com/x');
    document.activeElement!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  });
  await expect(page.getByRole('link', { name: /1 item to place/ })).toBeVisible();
});

test('FN-1 undo: deleting a function can be undone', async ({ page }) => {
  await createWeddingPlan(page);
  await openFunction(page, 'Haldi');
  await page.getByRole('button', { name: 'Delete this function' }).click();
  await expect(page.locator('.fn-card', { hasText: 'Haldi' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.fn-card', { hasText: 'Haldi' })).toHaveCount(1);
});

test('DR15: sheets close with Escape and return focus to the trigger', async ({ page }) => {
  await createWeddingPlan(page);
  const fab = page.getByRole('button', { name: 'Add an item' });
  await fab.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Add an item' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(fab).toBeFocused();
});

test('IT-2: drop an image onto a plan to capture it', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not allow synthetic DataTransfer files');
  await createWeddingPlan(page);
  const bytes = [...(await import('node:fs')).readFileSync(PHOTO)];
  await page.evaluate((arr) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(arr)], 'lehenga.png', { type: 'image/png' }));
    document.body.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, bytes);
  await expect(page.getByRole('heading', { name: 'Saved' })).toBeVisible();
  await expect(page.getByText('lehenga', { exact: true })).toBeVisible();
});
