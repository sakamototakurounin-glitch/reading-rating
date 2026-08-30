import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const input = await readFile(new URL('../src/answer-input.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const quickApi = await readFile(new URL('../api/generate-quick.js', import.meta.url), 'utf8');
const longApi = await readFile(new URL('../api/generate-long.js', import.meta.url), 'utf8');
const gradeApi = await readFile(new URL('../api/grade-summary.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('top screen uses compact modes and profile instead of rating hero',()=>{
  assert.match(app,/compact-home/); assert.doesNotMatch(app,/rating-orbit/); assert.match(html,/profile-button/);
});
test('free response supports keyboard and handwriting modes',()=>{
  assert.match(input,/data-input-mode="keyboard"/); assert.match(input,/data-input-mode="handwriting"/); assert.match(input,/handwriting-canvas/);
});
test('handwriting supports undo, clear, recognition, and editable text',()=>{
  assert.match(input,/data-undo/); assert.match(input,/data-clear/); assert.match(input,/recognize-handwriting/); assert.match(input,/recognized-text/);
});
test('quick and long answer one question at a time',()=>{
  assert.match(app,/single-question/); assert.match(app,/session\.questionIndex/); assert.match(app,/renderLongSummary/);
});
test('onboarding offers the requested initial ratings and profile reset',()=>{
  assert.match(app,/initialOptions/); assert.match(app,/data-initial-rating/); assert.match(app,/data-confirm-reset/); assert.match(app,/renderRatingSetup/);
});
test('generated assessments require exactly four choices',()=>{
  assert.match(quickApi,/minItems:4,maxItems:4/); assert.match(longApi,/minItems:4,maxItems:4/); assert.doesNotMatch(quickApi,/minItems:3,maxItems:3,items:\{type:'string'\}/); assert.doesNotMatch(longApi,/minItems:3,maxItems:3,items:\{type:'string'\}/);
});
test('timed questions expose collapsed explanation and translation controls',()=>{
  assert.match(app,/QUESTION_LIMITS\.quick/); assert.match(app,/QUESTION_LIMITS\.long/); assert.match(app,/data-toggle="explanation"/); assert.match(app,/data-toggle="translation"/); assert.match(app,/全文和訳を見る/);
});
test('Long has WPM50 reading limit, concrete vocabulary, and structured summary feedback',()=>{
  assert.match(app,/longReadingLimitSeconds/); assert.match(app,/resolveUnknownWords/); assert.match(app,/contextMeaning/); assert.match(gradeApi,/goodPoints/); assert.match(gradeApi,/missingPoints/); assert.match(gradeApi,/modelAnswer/);
});
test('question timer starts after paint, uses a deadline, and stops on choice',()=>{ assert.match(app,/requestAnimationFrame\(\(\)=>requestAnimationFrame/); assert.match(app,/deadlineTimestamp=startTimestamp\+duration\*1000/); assert.match(app,/deadlineTimestamp-Date\.now\(\)/); assert.match(app,/addEventListener\('change',\(\)=>settle/); assert.match(app,/activeQuestionTimerCancel/); });
test('question timer is a sticky safe-area toolbar with separate warning thresholds',()=>{ assert.match(app,/mode==='quick'\?10:15/); assert.match(app,/question-toolbar/); assert.match(styles,/\.question-toolbar \{ position:sticky/); assert.match(styles,/env\(safe-area-inset-top\)/); });
test('recent semantic history is sent for both generators',()=>{ assert.match(app,/recentPassages:recentHistoryForPrompt/); assert.match(quickApi,/centralThesis/); assert.match(quickApi,/mainExamples/); assert.match(longApi,/buildDifficultyProfile/); assert.match(longApi,/isTooSimilar/); });
test('generators require passage-dependent question audits',()=>{ for(const source of [quickApi,longApi]){assert.match(source,/commonKnowledgeAnswerable/);assert.match(source,/passageSpecificEvidence/);assert.match(source,/specialistKnowledgeRequired/);assert.match(source,/properNounRecall/);assert.match(source,/Could a reasonably educated person answer this correctly without reading the passage/);} });
test('generators track case structure instead of title-only novelty',()=>{ for(const source of [quickApi,longApi]){assert.match(source,/caseType/);assert.match(source,/fictionalEntityName/);assert.match(source,/keyMechanism/);assert.match(source,/outcome/);assert.match(source,/argumentPattern/);} });
test('Quick generates its three rich passages in parallel',()=>{ assert.match(quickApi,/Promise\.all\(\[0,1,2\]\.map/); assert.match(quickApi,/categoryGroups/); });
