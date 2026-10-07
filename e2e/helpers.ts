import { expect, type Page } from '@playwright/test';
import path from 'node:path';

export const PHOTO = path.resolve('public/icon-512.png');

export async function freshApp(page: Page) {
  await page.goto('./');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((res) => {
      const r = indexedDB.deleteDatabase('trousseau');
      r.onsuccess = r.onerror = r.onblocked = () => res();
    });
  });
  await page.goto('./#/');
}

/** PL-1: template, name, preset, then the plan screen. */
export async function createWeddingPlan(page: Page, owner = 'Priya') {
  await page.getByRole('link', { name: 'Start a plan' }).click();
  await page.getByPlaceholder('Your name').fill(owner);
  await page.getByPlaceholder("e.g. Riya and Kabir's wedding").fill("Ananya's wedding");
  await page.getByRole('button', { name: /Create plan with 5 functions/ }).click();
  await expect(page.getByRole('heading', { name: "Ananya's wedding" })).toBeVisible();
}

export async function openFunction(page: Page, name: string) {
  await page.locator('.fn-card', { hasText: name }).click();
  await expect(page.getByLabel('Function name')).toHaveValue(name);
}
