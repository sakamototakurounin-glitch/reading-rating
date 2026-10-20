import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

for(const level of [0,2])test(`Level ${level}: five correct answers score20, summary caps at10, review content stays aligned`,async({page})=>{
  const bank=JSON.parse(await readFile(new URL(`../data/banks/long/level-${level}.json`,import.meta.url),'utf8')).items;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Serve actual checked-in data directly; avoid Windows proxy/HTTP transfer delays.
  await page.route(`**/data/banks/long/level-${level}.json`,route=>route.fulfill({contentType:'application/json',path:fileURLToPath(new URL(`../data/banks/long/level-${level}.json`,import.meta.url))}));
  await page.route('**/data/translations/long/*.json',route=>route.fulfill({contentType:'application/json',path:fileURLToPath(new URL(`..${new URL(route.request().url()).pathname}`,import.meta.url))}));
  await page.route('**/api/**',route=>route.fulfill({status:503,body:'{}'}));
  await page.route('**/api/grade-summary',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({elements:Array.from({length:6},(_,i)=>({name:`要素${i}`,score:1,reason:'テスト'})),impressionScore:5,goodPoints:'テスト',missingPoints:'なし',improvements:'なし',modelSummary:'これは画面と採点処理を確認するためのテスト用の模範要約です。'.repeat(5)})}));
  await page.addInitScript(rating=>{Math.random=()=>.5;localStorage.setItem('reading-rating-state-v1',JSON.stringify({internalRating:rating,quickTimeLimit:120,longHistory:[],quickHistory:[],passageHistory:[]}));},level*10);
  await page.goto('/');expect(errors).toEqual([]);await expect(page.locator('.compact-home')).toBeVisible({timeout:10000});await page.locator('[data-start="long"]').click();
  await page.locator('[data-begin-reading]').click();
  await expect(page.locator('.passage-level')).toHaveText(`Level ${level}`);
  const title=await page.locator('.long-passage-scroll h1').textContent();
  const passage=bank.find(p=>p.passage.title===title);expect(passage).toBeTruthy();
  await page.locator('[data-finish]').click();
  let firstJapanese;
  for(const q of passage.questions){
    await expect(page.locator('.question-card legend')).toHaveText(q.stem);
    const labels=page.locator('.choice-list label');const texts=await labels.allTextContents();
    const correct=q.choices.find(c=>c.id===q.correct_choice_id);expect(correct.score).toBe(4);
    if(q.stem_ja){
      expect(await page.getByText(q.stem_ja,{exact:true}).count()).toBe(0);
      if(!firstJapanese)firstJapanese={prompt:q.stem_ja,choices:texts.map(t=>q.choices.find(c=>c.text===t.slice(1).trim()).text_ja)};
    }
    const index=texts.findIndex(t=>t.slice(1).trim()===correct.text);expect(index).toBeGreaterThanOrEqual(0);
    await labels.nth(index).click();await page.locator('[data-confirm]').click();
  }
  await page.locator('[data-input-mode="keyboard"]').click();
  await page.locator('[data-keyboard-text]').fill('本文では具体的な事例や観察を比較し、それぞれの証拠が何を示すのかを説明している。条件や対象の違いを区別し、結果の一部から全体を判断せずに考える必要がある。'.repeat(2));
  await page.locator('form').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));
  await expect(page.locator('.result-page')).toBeVisible();
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('reading-rating-state-v1')).longHistory[0]);
  expect(record.multipleChoiceScore).toBe(20);expect(record.rawSummaryScore).toBe(11);expect(record.summaryScore).toBe(10);expect(record.totalScore).toBe(30);expect(record.scoreMax).toBe(30);
  await page.getByText('選択問題・本文を復習',{exact:true}).click();
  await page.locator('.review-content > details > summary').click();
  if(firstJapanese){
    const review=page.locator('.answer-review').first();
    await review.getByText('和訳を見る',{exact:true}).click();
    await expect(review.getByText(firstJapanese.prompt,{exact:true})).toBeVisible();
    await expect(review.locator('.choice-ja li')).toHaveText(firstJapanese.choices);
    expect(await review.getByText('解説を見る',{exact:true}).count()).toBe(0);
  }else await expect(page.locator('.answer-review').first().getByText('解説を見る',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
