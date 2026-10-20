import test from 'node:test';
import assert from 'node:assert/strict';
import { quickReadingLimitSeconds, updateQuickRating } from '../lib/quick.js';
import { normalizeState, loadState, saveState } from '../lib/storage.js';
import { mergeSessionHistory } from '../lib/history-db.js';

test('Quick applies every requested single-session delta, including fixed minus3 for zero through four',()=>{
  for(let correct=0;correct<=9;correct++){
    const delta=[-3,-3,-3,-3,-3,-2,-1,0,1,2][correct];
    assert.deepEqual(updateQuickRating(40,correct),{delta,newRating:40+delta});
  }
});

test('Quick Rating floors at zero, retains fractional seeds and follows Long internal/display separation',()=>{
  assert.deepEqual(updateQuickRating(0,0),{delta:0,newRating:0});
  assert.deepEqual(updateQuickRating(1,4),{delta:-1,newRating:0});
  assert.deepEqual(updateQuickRating(40.5,8),{delta:1,newRating:41.5});
  assert.equal(updateQuickRating(100,9).newRating,102);
  for(const n of [-1,10,1.5,NaN])assert.throws(()=>updateQuickRating(40,n),RangeError);
});

test('Rating zero through ten uses the same minimum timing speed, without flooring the stored Rating',()=>{
  for(const r of [0,1,5,9,10])assert.equal(quickReadingLimitSeconds(200,r),400);
  assert.equal(quickReadingLimitSeconds(200,11),364);
  assert.equal(quickReadingLimitSeconds(201,40),101);
  assert.equal(quickReadingLimitSeconds(200,40),100);
  assert.equal(quickReadingLimitSeconds(200,80),50);
  for(const n of [0,-1,NaN,Infinity])assert.throws(()=>quickReadingLimitSeconds(n,40),RangeError);
});

test('legacy state seeds Quick once from Long without altering old WPM histories or time-limit keys',()=>{
  const saved={internalRating:62.5,quickTimeLimit:105,quickHistory:[{id:'old-quick',averageWPM:150,correctAnswers:8}],longHistory:[{id:'old-long',WPM:100}]};
  const migrated=normalizeState(saved);
  assert.equal(migrated.quickRating,62.5);
  assert.equal(saved.quickRating,undefined);
  assert.equal(migrated.quickTimeLimit,105);
  assert.strictEqual(migrated.quickHistory,saved.quickHistory);
  assert.strictEqual(migrated.longHistory,saved.longHistory);
  assert.deepEqual(normalizeState({...migrated,internalRating:80}).quickRating,62.5);
  assert.equal(normalizeState({...saved,quickRating:0}).quickRating,0);
  assert.equal(normalizeState().quickRating,null);
});

test('Quick Rating survives localStorage round trips independently of Long',()=>{
  const original=globalThis.localStorage;const data=new Map();
  globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
  try{
    saveState({internalRating:70,quickRating:42,longHistory:[],quickHistory:[]});
    const state=loadState();assert.equal(state.internalRating,70);assert.equal(state.quickRating,42);
  }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});

test('local-only legacy histories are retained alongside newer IndexedDB Rating records',()=>{
  const legacy={id:'legacy',date:'2026-01-01',averageWPM:123};
  const current={id:'new',date:'2026-10-20',internalRatingAfter:42};
  const merged=mergeSessionHistory('quick',[current,legacy],[current]);
  assert.deepEqual(merged,[current,legacy]);
  assert.deepEqual(mergeSessionHistory('quick',merged,merged),merged);
  const withId=mergeSessionHistory('long',[{date:'2020-01-01',WPM:60}],[]);
  assert.equal(withId[0].WPM,60);assert.ok(withId[0].id);assert.equal(legacy.averageWPM,123);
});
