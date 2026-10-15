const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const quick=JSON.parse(await fs.readFile('data/banks/quick.json','utf8')).passages;
const long=(await Promise.all(Array.from({length:10},async(_,i)=>JSON.parse(await fs.readFile(`data/banks/long/level-${i}.json`,'utf8')).items))).flat();
const sourceQuestions=[...quick.flatMap(p=>p.questions.map(q=>({prompt:q.prompt,text:q.options.find(o=>o.id===q.answer_id).text}))),...long.flatMap(p=>p.questions.map(q=>({prompt:q.stem,text:q.choices.find(o=>o.id===q.correct_choice_id).text})))];
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await context.addInitScript(()=>{
  Math.random=()=>.5;
  if(!localStorage.getItem('reading-rating-state-v1'))localStorage.setItem('reading-rating-state-v1',JSON.stringify({internalRating:50.9,quickTimeLimit:120,longHistory:[],quickHistory:[],passageHistory:[]}));
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copied=text;}}});
});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const urls=[];page.on('request',r=>urls.push(new URL(r.url()).pathname));
let gradeCalls=0,lookupCalls=0,handwritingCalls=0;
const summary='本文は、制度の仕組みと条件を比較し、観測結果の限界を踏まえて判断する必要があると述べている。複数の証拠を区別し、単一の結果から広い結論を出さない点を説明している。';
await page.route('**/api/grade-summary',async route=>{gradeCalls++;await new Promise(r=>setTimeout(r,100));await route.fulfill({status:gradeCalls===1?503:200,contentType:'application/json',body:JSON.stringify(gradeCalls===1?{error:'test temporary outage'}:{elements:Array.from({length:6},(_,i)=>({name:`要素${i}`,score:1,reason:'テスト'})),impressionScore:5,goodPoints:'論理を説明できています',missingPoints:'なし',improvements:'確認を続けてください',modelSummary:summary})});});
await page.route('**/api/lookup-words',async route=>{lookupCalls++;const body=route.request().postDataJSON();await route.fulfill({contentType:'application/json',body:JSON.stringify(body.words.map(word=>({word,generalMeaning:'意味を確認する',exampleSentence:body.passage.split(/[.!?]/)[0]+'.'})))});});
await page.route('**/api/recognize-handwriting',async route=>{handwritingCalls++;await route.fulfill({contentType:'application/json',body:JSON.stringify({text:summary})});});
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('reading-rating-state-v1')));
async function answerCorrect(){const prompt=(await page.locator('.question-card legend').textContent()).trim();const q=sourceQuestions.find(q=>q.prompt===prompt);assert.ok(q,prompt);const labels=page.locator('.choice-list label');const texts=await labels.allTextContents();const i=texts.findIndex(t=>t.slice(1).trim()===q.text);assert.ok(i>=0,'correct content exists');await labels.nth(i).click();await page.locator('[data-confirm]').click();}
try {
  await page.goto('http://127.0.0.1:4178/');await page.locator('[data-start="quick"]').click();await page.locator('[data-begin-reading]').waitFor();assert.equal(await page.locator('.passage-text').count(),0);
  for(let p=0;p<3;p++){await page.locator('[data-begin-reading]').click();await page.locator('[data-finish]').click();assert.equal(await page.locator('.quick-reading').count(),0);for(let q=0;q<3;q++)await answerCorrect();}
  const quickState=await state();assert.equal(quickState.quickHistory[0].correctAnswers,9);assert.equal(quickState.quickHistory[0].readingTimes.length,3);assert.ok(quickState.quickHistory[0].readingTimes.every(t=>t>=1&&t<10));assert.equal(quickState.quickTimeLimit,105);assert.equal(urls.filter(u=>u==='/data/banks/quick.json').length,1);
  await page.locator('[data-home]').click();await page.locator('[data-start="long"]').click();await page.locator('[data-begin-reading]').click();assert.equal(await page.locator('.passage-level').textContent(),'Level 5');
  const scrolling=await page.evaluate(()=>{const area=document.querySelector('.long-passage-scroll'),bar=document.querySelector('.long-reader-bar');const top=bar.getBoundingClientRect().top;area.scrollTop=area.scrollHeight;return {moved:area.scrollTop>0,stable:bar.getBoundingClientRect().top===top,body:document.documentElement.scrollWidth<=innerWidth};});assert.deepEqual(scrolling,{moved:true,stable:true,body:true});
  await page.locator('.long-passage-scroll').evaluate(e=>e.scrollTop=0);await page.locator('.word-token').first().click();await page.locator('[data-finish]').click();
  for(let q=0;q<5;q++){assert.equal(await page.locator('.long-copy').count(),0);await page.locator('.question-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);assert.equal(await page.locator('.fixed-question-timer').evaluate(e=>Math.round(e.getBoundingClientRect().top)),0);await answerCorrect();}
  await page.locator('[data-input-mode="handwriting"]').click();const box=await page.locator('canvas').boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+80,box.y+60,{steps:5});await page.mouse.up();await page.locator('[data-recognize]').click();await page.waitForFunction(()=>document.querySelector('[data-recognized-text]').value.length>40);assert.equal(handwritingCalls,1);
  await page.locator('[data-input-mode="keyboard"]').click();await page.locator('[data-keyboard-text]').fill(summary);
  await page.locator('form').evaluate(form=>{form.dispatchEvent(new Event('submit',{cancelable:true}));form.dispatchEvent(new Event('submit',{cancelable:true}));});await page.locator('[data-retry-grade]').waitFor();assert.equal(gradeCalls,1);
  assert.equal((await state()).internalRating,50.9);assert.equal((await state()).longHistory.length,0);assert.ok((await state()).pendingLong);
  await page.reload();await page.locator('[data-resume-grade]').click();await page.locator('[data-retry-grade]').click();await page.locator('[data-copy-3]').waitFor();
  const saved=await state();assert.equal(gradeCalls,2);assert.equal(lookupCalls,1);assert.equal(saved.longHistory.length,1);assert.equal(saved.longHistory[0].multipleChoiceScore,15);assert.equal(saved.longHistory[0].rawSummaryScore,11);assert.equal(saved.longHistory[0].summaryScore,10);assert.equal(saved.longHistory[0].totalScore,25);assert.equal(saved.pendingLong,undefined);
  await page.locator('[data-copy-3]').click();assert.equal((await page.evaluate(()=>window.__copied)).split('\t').length,3);
  await page.locator('.profile-button').click();await page.locator('[data-history="long"]').click();await page.locator('[data-history-detail]').click();await page.locator('[data-copy-history]').click();assert.match(await page.evaluate(()=>window.__copied),/意味を確認する/);
  await page.locator('.brand').click();const seen=[];
  for(let i=0;i<5;i++){await page.locator('[data-start="long"]').click();await page.locator('[data-begin-reading]').waitFor();seen.push((await state()).bankProgress.long[5].lastId);await page.locator('[data-begin-reading]').click();await page.locator('[data-home]').click();}
  assert.equal(new Set(seen).size,5);assert.ok(!urls.some(u=>u.includes('/api/generate-')));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',viewport:390,quick:'3 passages/9 questions; reading-only WPM; bank cached',long:'5 questions; level5; 5 distinct new starts',summary:'503 pending survives reload; retry25/25; no duplicate save',otherApis:{gradeCalls,lookupCalls,handwritingCalls},generationRequests:0,pageErrors:errors},null,2));
} finally {await browser.close();}
