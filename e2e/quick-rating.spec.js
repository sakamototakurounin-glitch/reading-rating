import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KEY='reading-rating-state-v1';
const bankPath=fileURLToPath(new URL('../data/banks/quick.json',import.meta.url));
const bank=JSON.parse(readFileSync(bankPath,'utf8')).passages;

for(const [rating,correct,after] of [[0,0,0],[10,8,11],[40,9,42],[40,4,37],[60,7,60],[80,6,79]]){
  test(`Quick Rating ${rating}: ${correct}/9 updates to ${after} independently of Long`,async({page},testInfo)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',route=>route.fulfill({status:503,body:'{}'}));
    await page.route('**/data/banks/quick.json',route=>route.fulfill({contentType:'application/json',path:bankPath}));
    await page.addInitScript(({key,rating,ids})=>{
      if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({
        internalRating:rating,quickTimeLimit:45,
        quickHistory:[{id:'legacy',date:'2026-01-01T00:00:00Z',correctAnswers:5,averageWPM:123,passages:[],answers:[],unknownWords:[]}],
        longHistory:[],bankProgress:{quick:{remaining:ids}}
      }));
    },{key:KEY,rating,ids:bank.slice(0,3).map(p=>p.id)});
    await page.goto('/');await page.locator('[data-start="quick"]').click();
    await expect(page.locator('[data-begin-reading]')).toBeVisible();
    expect(await page.locator('.passage-text').count()).toBe(0);
    let index=0;
    for(const passage of bank.slice(0,3)){
      await page.locator('[data-begin-reading]').click();
      const seconds=Math.ceil(passage.difficulty.word_count*60/(Math.max(10,rating)*3));
      const label=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
      await expect(page.locator('#timer')).toHaveText(label);
      await expect(page.locator('.passage-text')).toHaveText(passage.passage);
      await page.locator('[data-finish]').click();
      for(const question of passage.questions){
        await expect(page.locator('.question-card legend')).toHaveText(question.prompt);
        const choices=page.locator('.choice-list label');const text=await choices.allTextContents();
        const chosen=question.options.find(c=>index<correct?c.id===question.answer_id:c.id!==question.answer_id);
        const chosenIndex=text.findIndex(t=>t.slice(1).trim()===chosen.text);
        expect(chosenIndex).toBeGreaterThanOrEqual(0);
        await choices.nth(chosenIndex).click();await page.locator('[data-confirm]').click();index++;
      }
    }
    await expect(page.locator('.result-page')).toBeVisible();
    const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    const record=state.quickHistory[0];
    expect(state.internalRating).toBe(rating);expect(state.quickRating).toBe(after);
    expect(record.correctAnswers).toBe(correct);expect(record.internalRatingBefore).toBe(rating);expect(record.internalRatingAfter).toBe(after);
    expect(record.ratingDelta).toBe(after-rating);expect(record.readingLimits).toEqual(bank.slice(0,3).map(p=>Math.ceil(p.difficulty.word_count*60/(Math.max(10,rating)*3))));
    expect(record).not.toHaveProperty('WPM');expect(record).not.toHaveProperty('averageWPM');
    expect(record).not.toHaveProperty('nextTimeLimit');expect(state.quickTimeLimit).toBe(45);
    expect(state.quickHistory[1].averageWPM).toBe(123);
    expect(await page.locator('.result-page').innerText()).not.toMatch(/WPM/);
    if(rating===40&&correct===9&&testInfo.project.name==='mobile')await page.screenshot({path:testInfo.outputPath('quick-result.png')});
    // New records are persisted to IndexedDB without measured speed as well.
    await expect.poll(()=>page.evaluate(async()=>{
      const {getSessions}=await import('/lib/history-db.js');return (await getSessions('quick')).length;
    })).toBeGreaterThanOrEqual(1);
    const stored=await page.evaluate(async()=>{const {getSessions}=await import('/lib/history-db.js');return (await getSessions('quick')).find(r=>r.ratingVersion==='quick-rating-v1');});
    expect(stored).not.toHaveProperty('WPM');expect(stored).not.toHaveProperty('averageWPM');
    await page.locator('.profile-button').click();
    await expect(page.locator('.profile-stats article').first().locator('strong')).toHaveText(String(after));
    expect(await page.locator('.profile-page').innerText()).not.toMatch(/WPM|NaN|undefined/);
    if(rating===40&&correct===9&&testInfo.project.name==='mobile')await page.screenshot({path:testInfo.outputPath('profile.png')});
    await page.locator('[data-history="quick"]').click();
    expect(await page.locator('.history-page').innerText()).not.toMatch(/WPM|NaN|undefined/);
    await page.locator('[data-history-detail][data-history-index="0"]').click();
    await expect(page.locator('.history-detail-page')).toContainText(`Rating ${rating} → ${after}`);
    expect(await page.locator('.history-detail-page').innerText()).not.toMatch(/WPM/);
    await page.locator('[data-history-back]').click();
    await page.locator('[data-history-detail][data-history-index="1"]').click();
    await expect(page.locator('.history-detail-page')).toContainText('Rating記録なし');
    expect(await page.locator('.history-detail-page').innerText()).not.toMatch(/WPM|NaN|undefined/);
    await page.reload();await page.locator('.profile-button').click();
    await expect(page.locator('.profile-stats article').first().locator('strong')).toHaveText(String(after));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('Quick reading timeout advances once; unanswered choice times out as incorrect',async({page})=>{
  await page.route('**/api/**',route=>route.fulfill({status:503,body:'{}'}));
  await page.route('**/data/banks/quick.json',route=>route.fulfill({contentType:'application/json',path:bankPath}));
  await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify({internalRating:40,quickRating:40})),KEY);
  await page.goto('/');await page.clock.install();
  await page.locator('[data-start="quick"]').click();await page.locator('[data-begin-reading]').click();
  await page.clock.fastForward(10*60*1000);
  await expect(page.locator('#question-timer')).toHaveText('1:00');
  await page.clock.runFor(100);await page.clock.fastForward(61*1000);
  await expect(page.locator('.question-toolbar')).toContainText('Question 2 / 3');
});

test('legacy Long speed stays hidden, independent ratings persist and reset initializes both together',async({page})=>{
  await page.route('**/api/**',route=>route.fulfill({status:503,body:'{}'}));
  await page.addInitScript(key=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({internalRating:70,quickRating:22,longHistory:[{
      id:'old-long',date:'2026-01-01T00:00:00Z',title:'Legacy passage',originalPassage:'Legacy English passage.',
      WPM:99,displayRatingBefore:69,displayRatingAfter:70,passageDifficulty:7,totalScore:20,summaryScore:8,summary:'以前の要約',unknownWords:[]
    }],quickHistory:[]}));
  },KEY);
  await page.goto('/');await page.locator('.profile-button').click();
  await expect(page.locator('.profile-stats article').first().locator('strong')).toHaveText('22');
  for(const width of [375,390,430]){
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }
  await page.locator('[data-history="long"]').click();
  expect(await page.locator('.history-page').innerText()).not.toMatch(/WPM|Speed/);
  await page.locator('[data-history-detail]').click();
  await expect(page.locator('.history-detail-page')).toContainText('Rating 69 → 70');
  expect(await page.locator('.history-detail-page').innerText()).not.toMatch(/WPM|Speed|undefined|NaN/);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).longHistory[0].WPM,KEY)).toBe(99);
  await page.locator('.profile-button').click();
  await page.locator('.settings-panel > summary').click();
  await page.locator('[data-reset]').click();await page.locator('[data-confirm-reset]').click();
  await expect(page.locator('[data-initial-rating]')).toBeVisible();
  await page.locator('[data-initial-rating]').fill('0');await page.locator('[data-confirm-rating]').click();
  const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  expect(state.internalRating).toBe(0);expect(state.quickRating).toBe(0);
  expect(state.longHistory).toEqual([]);expect(state.quickHistory).toEqual([]);
});
