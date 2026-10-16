import test from 'node:test';
import assert from 'node:assert/strict';
import {LONG_SCORING,scoreLong,longScoreMax,longChoiceMax} from '../lib/long-scoring.js';
import {expectedAccuracy,passageRating,updateRatingWithCalibration} from '../lib/rating.js';
test('Long is five four-point questions plus a capped integer ten-point summary',()=>{
  assert.equal(LONG_SCORING.scoreMax,30);
  for(let correct=0;correct<=5;correct++)for(const raw of [0,.5,8.5,10,10.5,11]){
    const score=scoreLong(correct,raw);assert.equal(score.multipleChoiceScore,correct*4);assert.equal(score.summaryScore,Math.min(10,Math.floor(raw)));assert.equal(score.totalScore,correct*4+score.summaryScore);assert.equal(score.actualAccuracy,score.totalScore/30);
  }
  assert.equal(scoreLong(5,11).totalScore,30);assert.throws(()=>scoreLong(6,10));
});
test('appropriate rating expects two thirds = exactly 20/30 and no calibration bonus',()=>{
  for(let level=0;level<=17;level++){
    const rating=passageRating(level),expected=expectedAccuracy(rating,level);
    assert.ok(Math.abs(expected*30-20)<1e-12);
    const accuracy=scoreLong(3,8).actualAccuracy;
    assert.equal(accuracy,20/30);
    assert.ok(Math.abs(updateRatingWithCalibration(rating,accuracy,expected,0).delta)<1e-12);
  }
});
test('historical 25-point sessions are not relabeled as 30-point sessions',()=>{
  assert.equal(longScoreMax({totalScore:25}),25);assert.equal(longChoiceMax({multipleChoiceScore:15}),15);
  assert.equal(longScoreMax({scoreMax:30}),30);assert.equal(longChoiceMax({multipleChoiceMax:20}),20);
});
