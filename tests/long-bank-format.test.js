import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LONG_SCORING } from '../lib/long-scoring.js';

const example=JSON.parse(await readFile(new URL('../data/banks/long/level-2.json',import.meta.url))).items[0];
const command=fileURLToPath(new URL('../scripts/long_bank_format.py',import.meta.url));
function normalize(item){return spawnSync(process.env.PYTHON||(process.platform==='win32'?'python':'python3'),['-X','utf8',command],{input:JSON.stringify({items:[item]}),encoding:'utf8'});}

test('legacy three-point imports become four-point without altering Japanese translations or answer IDs',()=>{
  const legacy=structuredClone(example);
  for(const q of legacy.questions)q.choices.find(c=>c.id===q.correct_choice_id).score=3;
  const result=normalize(legacy);assert.ifError(result.error);assert.equal(result.status,0,result.stderr);
  const expected=structuredClone(legacy);
  for(const q of expected.questions)q.choices.find(c=>c.id===q.correct_choice_id).score=LONG_SCORING.pointsPerQuestion;
  assert.deepEqual(JSON.parse(result.stdout),{items:[expected]});
  assert.equal(normalize(expected).stdout,result.stdout,'normalization is idempotent');
});

test('import normalization rejects invalid IDs, partial credit and unsupported correct scores',()=>{
  for(const change of [
    q=>q.correct_choice_id='missing',
    q=>q.choices.find(c=>c.id!==q.correct_choice_id).score=2,
    q=>q.choices.find(c=>c.id===q.correct_choice_id).score=2,
  ]){
    const item=structuredClone(example);change(item.questions[0]);
    const result=normalize(item);assert.ifError(result.error);assert.notEqual(result.status,0);assert.equal(result.stdout,'');
  }
});
