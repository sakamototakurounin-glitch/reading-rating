import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const input = await readFile(new URL('../src/answer-input.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const quickApi = await readFile(new URL('../api/generate-quick.js', import.meta.url), 'utf8');
const longApi = await readFile(new URL('../api/generate-long.js', import.meta.url), 'utf8');
const lookupApi = await readFile(new URL('../api/lookup-words.js', import.meta.url), 'utf8');
const gradeApi = await readFile(new URL('../api/grade-summary.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('top screen uses compact modes and profile instead of rating hero',()=>{
  assert.match(app,/compact-home/); assert.doesNotMatch(app,/rating-orbit/); assert.match(html,/profile-button/);
});
test('top screen removes numbering and extra mode copy while using the same start-button design',()=>{
  const home=app.slice(app.indexOf('function renderHome()'),app.indexOf('function renderRatingSetup()'));
  assert.doesNotMatch(home,/mode-number|mode-kicker|3 Passages|Summary/); assert.equal((home.match(/primary-button dark/g)||[]).length,2);
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
test('timed questions confirm with next and defer correctness and explanations to results',()=>{
  assert.match(app,/QUESTION_LIMITS\.quick/); assert.match(app,/QUESTION_LIMITS\.long/); assert.match(app,/data-confirm disabled/); assert.match(app,/confirm\.onclick=\(\)=>settle/); assert.match(app,/answer-review/); assert.match(app,/解説を見る/);
});
test('Long has WPM50 reading limit, concrete vocabulary, and structured summary feedback',()=>{
  assert.match(app,/longReadingLimitSeconds/); assert.match(app,/resolveUnknownWords/); assert.match(app,/contextMeaning/); assert.match(gradeApi,/goodPoints/); assert.match(gradeApi,/missingPoints/); assert.match(gradeApi,/modelAnswer/);
});
test('question timer starts after paint, uses a deadline, and stops only on confirmation or timeout',()=>{ assert.match(app,/requestAnimationFrame\(\(\)=>requestAnimationFrame/); assert.match(app,/deadlineTimestamp=startTimestamp\+duration\*1000/); assert.match(app,/deadlineTimestamp-Date\.now\(\)/); assert.match(app,/selectedIndex=Number\(input\.value\);confirm\.disabled=false/); assert.doesNotMatch(app,/addEventListener\('change',\(\)=>settle/); assert.match(app,/if\(remainingTime<=0\)settle\(selectedIndex,true\)/); assert.match(app,/activeQuestionTimerCancel/); });
test('reading and question timers remain sticky without an overflow-clipped ancestor',()=>{ assert.match(app,/mode==='quick'\?10:15/); assert.match(styles,/\.session-head \{ position:-webkit-sticky; position:sticky/); assert.match(styles,/\.question-toolbar \{ position:-webkit-sticky; position:sticky/); assert.match(styles,/\.app-shell \{ min-height:100vh; overflow:visible; \}/); assert.doesNotMatch(styles,/\.app-shell \{[^}]*overflow:hidden/); assert.match(styles,/env\(safe-area-inset-top\)/); });
test('results show own and correct answers and switch original and translation in place',()=>{ assert.match(app,/自分の回答/); assert.match(app,/data-review-view="original"/); assert.match(app,/data-review-view="translation"/); assert.match(app,/data-review-panel="original"/); assert.match(app,/mountReviewToggles/); });
test('Vocabstar supports generated examples plus three-column and legacy two-column copies',()=>{ for(const source of [longApi,lookupApi])assert.match(source,/exampleSentence/); assert.match(app,/data-copy-3/); assert.match(app,/data-copy-2/); assert.match(app,/v\.word\}\\t\$\{v\.contextMeaning\}\\t\$\{v\.exampleSentence/); });
test('recent semantic history is sent for both generators',()=>{ assert.match(app,/recentPassages:recentHistoryForPrompt/); assert.match(quickApi,/centralThesis/); assert.match(quickApi,/mainExamples/); assert.match(longApi,/buildDifficultyProfile/); assert.match(longApi,/isTooSimilar/); });
test('generators require passage-dependent question audits',()=>{ for(const source of [quickApi,longApi]){assert.match(source,/commonKnowledgeAnswerable/);assert.match(source,/passageSpecificEvidence/);assert.match(source,/specialistKnowledgeRequired/);assert.match(source,/properNounRecall/);assert.match(source,/Could a reasonably educated person answer this correctly without reading the (?:passage|document)/);} });
test('generators track case structure instead of title-only novelty',()=>{ for(const source of [quickApi,longApi]){assert.match(source,/caseType/);assert.match(source,/fictionalEntityName/);assert.match(source,/keyMechanism/);assert.match(source,/outcome/);assert.match(source,/argumentPattern/);} });
test('Quick generates its three rich passages in parallel',()=>{ assert.match(quickApi,/Promise\.all\(\[0,1,2\]\.map/); assert.match(quickApi,/categoryGroups/); });
test('version 1.1 is visible and package version is aligned',()=>{ assert.match(html,/ver 1\.1/); assert.equal(packageJson.version,'1.1.0'); });
test('reading columns use wider compact layouts',()=>{ assert.match(styles,/\.quick-reading \{[^}]*max-width:1180px/); assert.match(styles,/\.long-copy \{[^}]*max-width:1040px/); assert.match(styles,/\.focus-question,.summary-page \{[^}]*max-width:1080px/); });
test('Quick generation is TOEIC-oriented and practical',()=>{ assert.match(quickApi,/TOEIC-oriented/); assert.match(quickApi,/internal email, memo, notice, announcement/); assert.match(quickApi,/practical CEFR B1–B2 vocabulary/); });
