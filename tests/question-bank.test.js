import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adaptQuick, adaptLong, chooseLongLevel, takeBankItems, loadBank, isCorrectAnswer } from '../lib/question-bank.js';
import { nextRecentTimeLimit } from '../lib/quick.js';
import quickHandler from '../api/generate-quick.js';
import longHandler from '../api/generate-long.js';

const quick=JSON.parse(await readFile(new URL('../data/banks/quick.json',import.meta.url))).passages;
const levels=await Promise.all(Array.from({length:10},async(_,i)=>JSON.parse(await readFile(new URL(`../data/banks/long/level-${i}.json`,import.meta.url))).items));
test('only supplied 167 Quick / 240 Long passages, 1701 questions and 6804 choices exist',()=>{
  assert.equal(quick.length,167);assert.deepEqual(levels.map(v=>v.length),[10,10,10,20,50,50,50,20,10,10]);
  const ids=new Set();let questions=0,choices=0;
  for(const [mode,items] of [['quick',quick],['long',levels.flat()]])for(const p of items){assert.ok(!ids.has(p.id));ids.add(p.id);assert.equal(p.questions.length,mode==='quick'?3:5);for(const q of p.questions){assert.ok(!ids.has(q.id));ids.add(q.id);questions++;const options=q.options||q.choices;assert.equal(options.length,4);choices+=4;assert.equal(options.filter(c=>c.id===(q.answer_id||q.correct_choice_id)).length,1);if(mode==='long'){assert.equal(options.filter(c=>c.score===3).length,1);assert.equal(options.filter(c=>c.score===0).length,3);}}}
  assert.equal(questions,1701);assert.equal(choices,6804);
});
test('all adapted questions preserve text, IDs and correct content through repeated shuffles',()=>{
  for(const [mode,items,adapt] of [['quick',quick,adaptQuick],['long',levels.flat(),adaptLong]])for(const p of items)for(const r of [0,.23,.7,.999]){
    const result=adapt(p,()=>r);assert.equal(result.questions.length,mode==='quick'?3:5);
    p.questions.forEach((q,i)=>{const a=result.questions[i],options=q.options||q.choices,correctId=q.answer_id||q.correct_choice_id;assert.deepEqual([...a.choices].sort(),options.map(c=>c.text).sort());assert.equal(a.choiceIds[a.answer],correctId);assert.equal(a.correctChoiceId,correctId);assert.equal(a.choices[a.answer],options.find(c=>c.id===correctId).text);assert.ok(isCorrectAnswer({selectedId:correctId,answerId:correctId}));assert.ok(!isCorrectAnswer({selectedId:null,answerId:correctId}));assert.ok(a.evidence);assert.ok(a.explanation);});
  }
});
test('Quick consumes all 167 including the final two before restarting, with no session duplicate',()=>{
  let progress;const seen=[];for(let i=0;i<56;i++){const s=takeBankItems(quick,progress,3);progress=s.progress;assert.equal(new Set(s.items.map(p=>p.id)).size,3);seen.push(...s.items.map(p=>p.id));if(i===54)assert.equal(progress.remaining.length,2);}
  assert.equal(new Set(seen.slice(0,167)).size,167);assert.equal(progress.remaining.length,166);
});
test('every Long level exhausts only its own deck and avoids immediate cycle repeats',()=>{for(const bank of levels){let progress;const seen=[];for(let i=0;i<bank.length+1;i++){const s=takeBankItems(bank,progress,1);progress=s.progress;seen.push(s.items[0].id);}assert.equal(new Set(seen.slice(0,-1)).size,bank.length);assert.notEqual(seen.at(-1),seen.at(-2));assert.equal(progress.cycle,1);}});
test('Long level selection uses real rating, expected boundaries and 25/50/25 at rating50',()=>{
  const counts=Array(10).fill(0);for(let i=0;i<4000;i++)counts[chooseLongLevel(50,(i+.5)/4000)]++;
  assert.deepEqual(counts,[0,0,0,0,1000,2000,1000,0,0,0]);assert.equal(chooseLongLevel(50.9,.2),4);
  for(const rating of [-1,0,50,90,100,150])for(const r of [0,.25,.5,.999]){const l=chooseLongLevel(rating,r);assert.ok(l>=0&&l<=9);}
  assert.equal(chooseLongLevel(100,0),9);assert.equal(chooseLongLevel(0,.999),1);
});
test('bank loading caches concurrent requests and retries errors without AI',async()=>{
  let calls=0;const fetcher=async path=>{calls++;assert.equal(path,'/data/banks/long/level-2.json');return{ok:true,json:async()=>({items:levels[2]})};};
  const [a,b]=await Promise.all([loadBank('long',2,fetcher),loadBank('long',2,fetcher)]);assert.equal(calls,1);assert.equal(a,b);
  await assert.rejects(loadBank('long',1,async()=>({ok:false})));assert.equal((await loadBank('long',1,async()=>({ok:true,json:async()=>({items:levels[1]})}))).length,10);
});
test('Quick keeps existing bounds and adjustments but uses the latest three accuracy results',()=>{assert.equal(nextRecentTimeLimit(120,9,[{correctAnswers:5},{correctAnswers:7}]),120);assert.equal(nextRecentTimeLimit(120,9,[]),105);assert.equal(nextRecentTimeLimit(45,9,[{correctAnswers:9}]),45);});
test('retired generation endpoints return410 and cannot make an AI request',async()=>{const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('must not call');};try{for(const handler of [quickHandler,longHandler]){let status;let payload;const response={status(v){status=v;return this;},setHeader(){return this;},send(v){payload=JSON.parse(v);}};await handler({method:'POST',body:{}},response);assert.equal(status,410);assert.equal(payload.passage,undefined);}assert.equal(calls,0);}finally{globalThis.fetch=original;}});
