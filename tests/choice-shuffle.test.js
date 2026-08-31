import test from 'node:test';
import assert from 'node:assert/strict';
import { balanceLongChoices, balanceQuickChoices } from '../lib/choice-shuffle.js';
import { longPassage, quickSet } from '../data/fallback.js';

function seededRandom(seed) {
  let state=seed>>>0;
  return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
}

function counts(answers) {
  return [0,1,2,3].map((position)=>answers.filter((answer)=>answer===position).length);
}

function assertCorrectContentPreserved(original,shuffled) {
  original.forEach((question,index)=>{
    const originalCorrect=question.choices[question.answer];
    const shuffledQuestion=shuffled[index];
    assert.equal(shuffledQuestion.choices[shuffledQuestion.answer],originalCorrect);
    assert.deepEqual([...shuffledQuestion.choices].sort(),[...question.choices].sort());
  });
}

test('Long answer positions stay randomly ordered with a 2/1/1/1 distribution',()=>{
  const sequences=new Set();
  for(let seed=1;seed<=40;seed+=1){
    const result=balanceLongChoices(longPassage,seededRandom(seed));
    const answers=result.questions.map((question)=>question.answer); sequences.add(answers.join(''));
    assert.deepEqual(counts(answers).sort((a,b)=>a-b),[1,1,1,2]);
    assertCorrectContentPreserved(longPassage.questions,result.questions);
  }
  assert.ok(sequences.size>10);
});

test('Quick answer positions stay randomly ordered with a 3/2/2/2 distribution',()=>{
  const original=quickSet.flatMap((passage)=>passage.questions); const sequences=new Set();
  for(let seed=41;seed<=80;seed+=1){
    const result=balanceQuickChoices(quickSet,seededRandom(seed));
    const questions=result.flatMap((passage)=>passage.questions); const answers=questions.map((question)=>question.answer); sequences.add(answers.join(''));
    assert.deepEqual(counts(answers).sort((a,b)=>a-b),[2,2,2,3]);
    assertCorrectContentPreserved(original,questions);
  }
  assert.ok(sequences.size>10);
});
