import { expect, test } from '@playwright/test';
import { createWeddingPlan, freshApp } from './helpers';

test('ST-2 ST-3: back up, then restore with keep both', async ({ page }) => {
  await freshApp(page);
  await createWeddingPlan(page);
  await page.goto('./#/settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back up now' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^trousseau-\d{4}-\d{2}-\d{2}\.trousseau$/);
  const file = await download.path();
  await expect(page.getByText(/Last backup:/)).toBeVisible();

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore from file' }).click();
  await (await chooser).setFiles(file!);
  await page.getByRole('button', { name: 'Keep both' }).click();
  await expect(page.getByRole('heading', { name: "Copy of Ananya's wedding" })).toBeVisible();
  await page.goto('./#/');
  await expect(page.getByRole('link', { name: /Ananya's wedding/ })).toHaveCount(2);
});

test('ST-3: a file that is not a backup is refused in plain words', async ({ page }) => {
  await freshApp(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restore from a backup' }).click();
  await (await chooser).setFiles({ name: 'notes.trousseau', mimeType: 'application/zip', buffer: Buffer.from('hello') });
  await expect(page.getByText("This file isn't a Trousseau backup, or it's damaged.")).toBeVisible();
});

test('DR18 DR19: settings reachable from home, theme defaults to System', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
