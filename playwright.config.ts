import { defineConfig, devices } from '@playwright/test';

const viewport = { width: 375, height: 812 };

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4173/clothes-planner/', trace: 'retain-on-failure' },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
  projects: [
    { name: 'webkit', use: { ...devices['iPhone 14'], viewport } },
    { name: 'chromium', use: { ...devices['Pixel 7'], viewport } },
  ],
});
