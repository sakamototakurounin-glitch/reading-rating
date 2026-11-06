import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadLongTranslation, isBankTranslationId } from '../lib/translation.js';
import { adaptQuick } from '../lib/question-bank.js';

const root=new URL('../',import.meta.url);
const bank=JSON.parse(await readFile(new URL('data/banks/quick.json',root),'utf8')).passages;
const kana=/[぀-ヿ]/;

test('Quick IDs load static translations from data/translations/quick',async()=>{
  assert.ok(isBankTranslationId('QR001'));assert.ok(isBankTranslationId('L3-001'));assert.ok(!isBankTranslationId('../QR001'));
  let path;await loadLongTranslation('QR999',async p=>{path=p;return {ok:true,json:async()=>({id:'QR999',paragraphs:[{id:'p1',text:'和訳です。'}]})};});
  assert.equal(path,'/data/translations/quick/QR999.json');
});

test('all 167 Quick passages have a paragraph-aligned Japanese translation',async()=>{
  for(const item of bank){
    const translated=await loadLongTranslation(item.id,async path=>({ok:true,json:async()=>JSON.parse(await readFile(new URL(path.slice(1),root),'utf8'))}));
    assert.equal(translated.split('\n\n').length,item.paragraphs.length,item.id);
  }
});

test('every Quick question has prompt and option translations that follow the shuffled order',()=>{
  for(const item of bank)for(const q of item.questions){
    assert.match(q.prompt_ja,kana,q.id);for(const o of q.options)assert.ok(o.text_ja&&/[぀-ヿ一-鿿]/.test(o.text_ja),q.id+o.id);
  }
  const p=adaptQuick(bank[0],()=>0.3);
  p.questions.forEach((a,i)=>{const q=bank[0].questions[i];assert.equal(a.promptJa,q.prompt_ja);assert.deepEqual(a.choicesJa,a.choiceIds.map(id=>q.options.find(o=>o.id===id).text_ja));});
});
