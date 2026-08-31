import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSummaryGrade } from '../lib/summary-scoring.js';

const grade=(elementScores,impressionScore)=>normalizeSummaryGrade({elements:elementScores.map((score,index)=>({name:`Element ${index+1}`,score,reason:'reason'})),elementScore:99,impressionScore,rawScore:99,feedback:'feedback',modelSummary:'model'});

test('summary score recalculates six elements and floors the displayed score to an integer',()=>{
  const result=grade([1,1,.5,0,.5,1],4.5);
  assert.equal(result.elements.length,6);
  assert.equal(result.elementScore,4);
  assert.equal(result.impressionScore,4.5);
  assert.equal(result.rawScore,8.5);
  assert.equal(result.displayScore,8);
  assert.equal(Number.isInteger(result.displayScore),true);
});

test('raw eleven is capped to ten for the Long total and Long remains out of 25',()=>{
  const result=grade([1,1,1,1,1,1],5);
  assert.equal(result.elementScore,6);
  assert.equal(result.rawScore,11);
  assert.equal(result.displayScore,10);
  assert.equal(15+result.displayScore,25);
});

test('returned aggregate scores are ignored while raw half-points are floored for display',()=>{
  const result=grade([1,.5,1,.5,0,1],3.5);
  assert.equal(result.elementScore,4);
  assert.equal(result.rawScore,7.5);
  assert.equal(result.displayScore,7);
});

test('raw scores above ten never add more than ten points to the Long total',()=>{
  const tenPointFive=grade([1,1,1,1,1,1],4.5);
  assert.equal(tenPointFive.rawScore,10.5);
  assert.equal(tenPointFive.displayScore,10);
  assert.equal(15+tenPointFive.displayScore,25);
});

test('exactly six passage-specific elements are required',()=>{
  assert.throws(()=>grade([1,1,1,1,1],5),/exactly six/);
});
