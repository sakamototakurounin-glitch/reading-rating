import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLongTranslation } from '../lib/translation.js';
import { readFile } from 'node:fs/promises';

test('all 240 static translations load in the browser format with every source paragraph',async()=>{
  const root=new URL('../',import.meta.url);let count=0;
  for(let level=0;level<10;level++){
    const bank=JSON.parse(await readFile(new URL(`data/banks/long/level-${level}.json`,root),'utf8')).items;
    for(const item of bank){
      const translated=await loadLongTranslation(item.id,async path=>({ok:true,json:async()=>{
        const source=await readFile(new URL(path.slice(1),root),'utf8');
        return JSON.parse(source);
      }}));
      assert.equal(translated.split('\n\n').length,item.passage.paragraphs.length,item.id);
      assert.doesNotMatch(translated,/未収録|翻訳予定|TODO/);count++;
    }
  }
  assert.equal(count,240);
});

test('static full translation is cached and preserves paragraph order',async()=>{
  let calls=0;
  const fetcher=async(path)=>{calls++;assert.equal(path,'/data/translations/long/L9-099.json');return {ok:true,json:async()=>({id:'L9-099',paragraphs:[{id:'p1',text:'最初の段落です。'},{id:'p2',text:'二番目の段落です。'}]})};};
  assert.deepEqual(await Promise.all([loadLongTranslation('L9-099',fetcher),loadLongTranslation('L9-099',fetcher)]),['最初の段落です。\n\n二番目の段落です。','最初の段落です。\n\n二番目の段落です。']);
  assert.equal(calls,1);
});
test('translation errors retry rather than caching a placeholder or English',async()=>{
  await assert.rejects(loadLongTranslation('../wrong'),/ID/);
  await assert.rejects(loadLongTranslation('L8-099',async()=>({ok:false})),/再試行/);
  await assert.rejects(loadLongTranslation('L8-099',async()=>({ok:true,json:async()=>({id:'L8-099',paragraphs:[{id:'p1',text:'English only'}]})})),/データ/);
  assert.equal(await loadLongTranslation('L8-099',async()=>({ok:true,json:async()=>({id:'L8-099',paragraphs:[{id:'p1',text:'正しい和訳です。'}]})})),'正しい和訳です。');
});
