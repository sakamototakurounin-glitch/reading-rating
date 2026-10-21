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

test('初回はスライドバーでRatingを選べる', async ({ page }) => {
  await page.goto('/');
  const slider = page.locator('[data-initial-rating]');
  await expect(slider).toBeVisible();
  await slider.fill('37');
  await expect(page.locator('[data-rating-value]')).toHaveText('37');
  await page.locator('[data-confirm-rating]').click();
  await expect(page.getByRole('heading', { name: 'Quick' })).toBeVisible();
  const saved = await page.evaluate(([key]) => JSON.parse(localStorage.getItem(key)), [KEY]);
  expect(saved.internalRating).toBe(37);
  expect(saved.quickRating).toBe(37);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('プロフィールにセッション数はなく、Rating推移ボタンで推移が見える', async ({ page }) => {
  const rec = (date, b, a) => ({ id: date, date, displayRatingBefore: b, displayRatingAfter: a, internalRatingBefore: b, internalRatingAfter: a, passageDifficulty: 3, totalScore: 20, passages: [], answers: [], questions: [] });
  const state = {
    internalRating: 45, quickRating: 33, passageHistory: [],
    quickHistory: [rec('2026-10-02T00:00:00.000Z', 30, 33), rec('2026-10-01T00:00:00.000Z', 28, 30)],
    longHistory: [rec('2026-10-03T00:00:00.000Z', 40, 45)],
  };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(state)]);
  await page.goto('/');
  await page.locator('.profile-button').click();
  await expect(page.locator('.profile-ratings')).toBeVisible();
  await expect(page.getByText('sessions', { exact: false })).toHaveCount(0);
  await page.locator('[data-trend]').click();
  await expect(page.getByRole('heading', { name: 'レーティングの推移' })).toBeVisible();
  await expect(page.locator('.trend-chart')).toBeVisible();
  await expect(page.locator('.trend-quick .trend-dot')).toHaveCount(3);
  await expect(page.locator('.trend-long .trend-dot')).toHaveCount(2);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator('[data-profile]').click();
  await expect(page.locator('.profile-ratings')).toBeVisible();
});
