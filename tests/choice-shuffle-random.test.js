import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffleLongChoices, shuffleQuickChoices } from '../lib/choice-shuffle.js';
import { longPassage, quickSet } from '../data/fallback.js';

function seededRandom(seed) {
  let state=seed>>>0;
  return ()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
}

function assertCorrectContentPreserved(original,shuffled) {
  original.forEach((question,index)=>{
    const originalCorrect=question.choices[question.answer];
    const shuffledQuestion=shuffled[index];
    assert.equal(shuffledQuestion.choices[shuffledQuestion.answer],originalCorrect);
    assert.deepEqual([...shuffledQuestion.choices].sort(),[...question.choices].sort());
  });
}

test('Long independently shuffles each question without session balancing',()=>{
  let observedConcentration=false;
  for(let seed=1;seed<=100;seed+=1){
    const result=shuffleLongChoices(longPassage,seededRandom(seed));
    const answers=result.questions.map((question)=>question.answer);
    const counts=[0,1,2,3].map((position)=>answers.filter((answer)=>answer===position).length);
    if(Math.max(...counts)>=3)observedConcentration=true;
    assertCorrectContentPreserved(longPassage.questions,result.questions);
  }
  assert.equal(observedConcentration,true);
});

test('Quick independently shuffles each question and permits coincidental concentration',()=>{
  const original=quickSet.flatMap((passage)=>passage.questions); let observedConcentration=false;
  for(let seed=101;seed<=200;seed+=1){
    const result=shuffleQuickChoices(quickSet,seededRandom(seed));
    const questions=result.flatMap((passage)=>passage.questions);
    const answers=questions.map((question)=>question.answer);
    const counts=[0,1,2,3].map((position)=>answers.filter((answer)=>answer===position).length);
    if(Math.max(...counts)>=4)observedConcentration=true;
    assertCorrectContentPreserved(original,questions);
  }
  assert.equal(observedConcentration,true);
});

test('pure shuffle can place every correct answer in the same position',()=>{
  const questions=Array.from({length:5},(_,index)=>({prompt:`Q${index}`,choices:['correct','one','two','three'],answer:0}));
  const result=shuffleLongChoices({questions},()=>0);
  assert.deepEqual(result.questions.map((question)=>question.answer),[3,3,3,3,3]);
});
