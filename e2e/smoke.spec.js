import { test, expect } from '@playwright/test';

const KEY = 'reading-rating-state-v1';

test.beforeEach(async ({ page }) => {
  // 外部APIへの実リクエストを防ぐ
  await page.route('**/api/**', (route) => route.fulfill({ status: 503, body: '{}' }));
});

test('ホームが表示され、エラーが出ない', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([key]) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ internalRating: 50 }));
  }, [KEY]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quick' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Long' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('保存データがリロード後も保持される', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(([key]) => localStorage.setItem(key, JSON.stringify({ internalRating: 42 })), [KEY]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Quick' })).toBeVisible();
  const saved = await page.evaluate(([key]) => JSON.parse(localStorage.getItem(key)), [KEY]);
  expect(saved.internalRating).toBe(42);
});

test('スマホ幅で横スクロールが発生しない', async ({ page }) => {
  await page.addInitScript(([key]) => localStorage.setItem(key, JSON.stringify({ internalRating: 50 })), [KEY]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quick' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
