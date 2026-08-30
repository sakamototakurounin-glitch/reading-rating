import test from 'node:test';
import assert from 'node:assert/strict';
import { passageRating, userLevel, expectedAccuracy, updateRating, updateRatingWithCalibration, displayRating } from '../lib/rating.js';
import { candidateDifficulties, selectDifficulty } from '../lib/difficulty.js';
import { nextTimeLimit } from '../lib/quick.js';

test('difficulty maps to rating anchors',()=>{ assert.deepEqual([0,2,7,12,17].map(passageRating),[2.5,12.5,37.5,62.5,87.5]); });
test('internal rating maps to hidden user level',()=>{ assert.deepEqual([12.5,37.5,62.5,87.5,92,97,100,117].map(userLevel),[2,7,12,17,18,19,20,20]); });
test('candidate difficulties clamp correctly',()=>{ assert.deepEqual(candidateDifficulties(62.5),[13,12,11,10,9]); assert.deepEqual([...new Set(candidateDifficulties(97))].sort((a,b)=>a-b),[16,17]); assert.deepEqual(candidateDifficulties(100),[17,17,17,17,17]); });
test('weighted selection honors boundaries',()=>{ assert.equal(selectDifficulty(62.5,0),13); assert.equal(selectDifficulty(62.5,0.21),12); assert.equal(selectDifficulty(62.5,.99),9); });
test('expected accuracy follows target curve',()=>{ const close=(a,b)=>assert.ok(Math.abs(a-b)<.012,`${a} ≉ ${b}`); close(expectedAccuracy(62.5,12),.667); close(expectedAccuracy(75,12),.809); close(expectedAccuracy(87.5,12),.9); close(expectedAccuracy(100,17),.809); });
test('rating delta is clamped and internal value may exceed 100',()=>{ assert.equal(updateRating(50,1,0).delta,2.5); assert.equal(updateRating(50,0,1).delta,-2.5); assert.ok(updateRating(100,1,.8).newRating>100); assert.equal(displayRating(103.7),100); });
test('first three Long sessions use five-times rating movement',()=>{ const first=updateRatingWithCalibration(50,1,0,0); const third=updateRatingWithCalibration(50,1,0,2); const fourth=updateRatingWithCalibration(50,1,0,3); assert.equal(first.delta,12.5); assert.equal(first.multiplier,5); assert.equal(third.delta,12.5); assert.equal(fourth.delta,2.5); assert.equal(fourth.multiplier,1); });
test('quick time adjustments are centralized and bounded',()=>{ assert.equal(nextTimeLimit(120,9),105); assert.equal(nextTimeLimit(120,8),110); assert.equal(nextTimeLimit(120,7),120); assert.equal(nextTimeLimit(120,6),130); assert.equal(nextTimeLimit(120,5),140); assert.equal(nextTimeLimit(45,9),45); });
