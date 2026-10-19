import { defineConfig, devices } from '@playwright/test';

// スマホ表示を優先。ローカル静的サーバーのみ使用し、本番APIには接続しない。
export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
