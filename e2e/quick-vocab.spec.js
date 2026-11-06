import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KEY='reading-rating-state-v1';
const bankPath=fileURLToPath(new URL('../data/banks/quick.json',import.meta.url));
const bank=JSON.parse(readFileSync(bankPath,'utf8')).passages;

test('Quick: 未知語をタップで記録し、結果で意味を表示・保存。本文と設問の和訳も見られる',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const lookups=[];
  await page.route('**/api/lookup-words',async route=>{const body=route.request().postDataJSON();lookups.push(body);
    await route.fulfill({contentType:'application/json',body:JSON.stringify(body.words.map(word=>({word,generalMeaning:'配分',meaningFormat:'short-ja-v2',exampleSentence:`Example with ${word}.`})))});});
  await page.route('**/api/**',route=>route.request().url().includes('lookup-words')?route.fallback():route.fulfill({status:503,body:'{}'}));
  await page.addInitScript(({key,ids})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({internalRating:40,quickRating:40,quickHistory:[],longHistory:[],passageHistory:[],bankProgress:{quick:{remaining:ids}}}));},{key:KEY,ids:bank.slice(0,3).map(p=>p.id)});
  await page.goto('/');await page.locator('[data-start="quick"]').click();
  const marked=[];
  for(const [n,passage] of bank.slice(0,3).entries()){
    await page.locator('[data-begin-reading]').click();
    await expect(page.locator('.quick-tap-guide')).toBeVisible();
    await expect(page.locator('.passage-text')).toHaveText(passage.passage);
    const taps=n===0?[3,12]:n===1?[5]:[];
    for(const i of taps){const token=page.locator('.word-token').nth(i);marked.push((await token.textContent()).toLowerCase());await token.click();await expect(token).toHaveClass(/unknown/);}
    await page.locator('[data-finish]').click();
    for(const question of passage.questions){
      await expect(page.locator('.question-card legend')).toHaveText(question.prompt);
      const choices=page.locator('.choice-list label');const text=await choices.allTextContents();
      await choices.nth(text.findIndex(t=>t.slice(1).trim()===question.options.find(o=>o.id===question.answer_id).text)).click();
      await page.locator('[data-confirm]').click();
    }
  }
  await expect(page.locator('.result-page')).toBeVisible();
  const card=page.locator('.vocab-card');
  await expect(card.locator('li')).toHaveCount(marked.length);
  await expect(card).toContainText('配分');await expect(card).not.toContainText('取得できませんでした');
  await expect(card.locator('[data-copy-3]')).toBeEnabled();
  expect(lookups.length).toBe(2);expect(lookups[0].passage).toBe(bank[0].passage);expect(lookups[1].passage).toBe(bank[1].passage);
  const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  expect(state.quickHistory[0].unknownWords.map(v=>v.word).sort()).toEqual([...new Set(marked)].sort());
  // 設問の和訳と本文の和訳
  await page.locator('.review-card > summary').click();
  await page.locator('.review-content > details > summary').first().click();
  const first=page.locator('.answer-review').first();
  await first.locator('details summary').click();
  await expect(first.locator('details summary')).toHaveText('和訳を見る');
  await expect(first.locator('details p').first()).toHaveText(bank[0].questions[0].prompt_ja);
  await expect(first.locator('.choice-ja li')).toHaveCount(4);
  await page.locator('[data-review-view="translation"]').first().click();
  const panel=page.locator('[data-review-panel="translation"]').first();
  await expect(panel).toContainText(JSON.parse(readFileSync(fileURLToPath(new URL(`../data/translations/quick/${bank[0].id}.json`,import.meta.url)),'utf8')).paragraphs[0].text.slice(0,12));
  // 履歴にも未知語が残る
  await page.locator('.profile-button').click();await page.locator('[data-history="quick"]').click();
  await page.locator('[data-history-detail][data-history-index="0"]').click();
  await expect(page.locator('.history-detail-page .vocab-card li')).toHaveCount(marked.length);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});
