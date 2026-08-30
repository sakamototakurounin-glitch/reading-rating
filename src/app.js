import { defaultState, loadState, resetState, saveState } from '../lib/storage.js';
import { displayRating, expectedAccuracy, passageRating, updateRatingWithCalibration } from '../lib/rating.js';
import { RATING } from '../lib/config.js';
import { selectDifficulty } from '../lib/difficulty.js';
import { calculateWpm, nextTimeLimit } from '../lib/quick.js';
import { QUESTION_LIMITS, longReadingLimitSeconds, validateLongContent, validateQuickSet } from '../lib/assessment.js';
import { addPassagesToHistory, recentHistoryForPrompt } from '../lib/passage-history.js';
import { quickSet, longPassage } from '../data/fallback.js';
import { answerInputHtml, mountAnswerInput } from './answer-input.js';

const app = document.querySelector('#app');
let store = loadState();
let session = null;
let activeQuestionTimerCancel = () => {};
const fmtTime = (seconds) => { const value=Math.max(0,Math.ceil(seconds)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`; };
const escapeHtml = (value='') => value.replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const nowSeconds = () => performance.now() / 1000;

function renderHome() {
  activeQuestionTimerCancel(); activeQuestionTimerCancel=()=>{};
  document.title = 'Reading Rating ver 1.1';
  if (store.internalRating === null || store.internalRating === undefined) { renderRatingSetup(); return; }
  app.innerHTML = `<section class="compact-home"><div class="home-heading"><p class="eyebrow">VER 1.1</p><h1>Choose a mode</h1></div><div class="compact-mode-grid" aria-label="トレーニングモード"><article class="compact-mode quick-mode"><h2>Quick</h2><button class="primary-button dark" data-start="quick">始める <span>→</span></button></article><article class="compact-mode long-mode"><h2>Long</h2><button class="primary-button dark" data-start="long">始める <span>→</span></button></article></div></section>`;
  app.querySelector('[data-start="quick"]').onclick = startQuick;
  app.querySelector('[data-start="long"]').onclick = startLong;
}

function renderRatingSetup() {
  app.innerHTML=`<section class="rating-setup"><div><p class="eyebrow">FIRST SETUP</p><h1>最初のRatingを選択</h1><p>現在の読解力に近い数値を選んでください。</p></div><div class="rating-options">${RATING.initialOptions.map((rating)=>`<button type="button" data-initial-rating="${rating}">${rating}</button>`).join('')}</div></section>`;
  app.querySelectorAll('[data-initial-rating]').forEach((button)=>button.onclick=()=>{store.internalRating=Number(button.dataset.initialRating);saveState(store);renderHome();});
}

async function requestContent(endpoint, payload, fallback, validate=(value)=>value) {
  try { const response = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); if (!response.ok) throw new Error(); return validate(await response.json()); }
  catch { return validate(fallback); }
}

async function startQuick() {
  renderLoading('Quick setを準備中', 'TOEICを意識した実務英文を3つ構成しています。');
  const passages = await requestContent('/api/generate-quick', {recentPassages:recentHistoryForPrompt(store.passageHistory)}, quickSet, validateQuickSet);
  store.passageHistory=addPassagesToHistory(store.passageHistory,passages,'quick'); saveState(store);
  session = { mode:'quick', passages, passageIndex:0, answers:[], readingTimes:[], phase:'reading', startedAt:nowSeconds(), limit:store.quickTimeLimit };
  renderQuickReading();
}

function renderQuickReading() {
  const item = session.passages[session.passageIndex]; session.startedAt = nowSeconds();
  app.innerHTML = `<section class="session-head"><button class="text-button" data-home>← 終了</button><div class="progress-label">QUICK ${session.passageIndex + 1} / 3</div><div class="timer-pill"><span>TIME</span><b id="timer">${fmtTime(session.limit)}</b></div></section><article class="quick-reading"><p class="eyebrow">${escapeHtml(item.topic)}</p><div class="passage-scroll"><p class="passage-text">${escapeHtml(item.passage)}</p></div><div class="sticky-action"><button class="primary-button dark" data-finish>問題へ <span>→</span></button></div></article>`;
  const timer = app.querySelector('#timer');
  const tick = setInterval(() => { const left = Math.max(0, session.limit - (nowSeconds() - session.startedAt)); timer.textContent = fmtTime(left); if (left <= 0) finishQuickReading(); }, 250);
  session.timer = tick; app.querySelector('[data-finish]').onclick = finishQuickReading; app.querySelector('[data-home]').onclick = () => { clearInterval(tick); renderHome(); };
}

function finishQuickReading() {
  clearInterval(session.timer); if (session.phase !== 'reading') return; session.phase = 'questions';
  session.readingTimes.push(Math.min(session.limit, Math.max(1, nowSeconds() - session.startedAt))); session.questionIndex=0; renderQuickQuestions();
}

function renderQuickQuestions() {
  const item=session.passages[session.passageIndex]; const question=item.questions[session.questionIndex];
  const finalQuestion=session.passageIndex===2&&session.questionIndex===2;
  renderTimedQuestion({mode:'quick',question,index:session.questionIndex,total:3,duration:QUESTION_LIMITS.quick,label:`QUICK ${session.passageIndex+1}/3`,confirmLabel:finalQuestion?'採点する':'次へ',onRecorded:(answer)=>session.answers.push(answer),onNext:()=>{session.questionIndex+=1;if(session.questionIndex<3)renderQuickQuestions();else{session.passageIndex+=1;session.phase='reading';session.passageIndex<3?renderQuickReading():renderQuickResult();}}});
}

function renderTimedQuestion({mode,question,index,total,duration,label,confirmLabel='次へ',onRecorded,onNext}) {
  activeQuestionTimerCancel();
  const inputName=`${mode}-answer`; let selectedIndex=null; let settled=false; let remainingTime=duration*1000; let timerId=null; let startTimestamp=null; let deadlineTimestamp=null;
  app.innerHTML=`<section class="focus-question"><div class="question-toolbar"><span>${label} · Question ${index+1} / ${total}</span><div class="question-timer" aria-live="polite"><span>残り</span><strong id="question-timer">${fmtTime(duration)}</strong></div></div><form><fieldset class="question-card single-question"><legend>${escapeHtml(question.prompt)}</legend><div class="choice-list">${choiceHtml(question,inputName)}</div></fieldset><div class="sticky-action"><button class="primary-button dark" type="button" data-confirm disabled>${confirmLabel} <span>→</span></button></div></form></section>`;
  const form=app.querySelector('form'); const timerElement=app.querySelector('#question-timer'); const warningAt=mode==='quick'?10:15;
  const cancelTimer=()=>{if(timerId!==null){clearInterval(timerId);timerId=null;}}; activeQuestionTimerCancel=cancelTimer;
  const tick=()=>{if(settled||deadlineTimestamp===null)return;remainingTime=Math.max(0,deadlineTimestamp-Date.now());timerElement.textContent=fmtTime(remainingTime/1000);timerElement.closest('.question-toolbar').classList.toggle('warning',remainingTime<=warningAt*1000);if(remainingTime<=0)settle(selectedIndex,true);};
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(settled)return;startTimestamp=Date.now();deadlineTimestamp=startTimestamp+duration*1000;remainingTime=duration*1000;timerElement.textContent=fmtTime(duration);timerId=setInterval(tick,200);tick();}));
  function settle(selected,timedOut=false) {
    if(settled)return; settled=true; cancelTimer(); activeQuestionTimerCancel=()=>{}; if(timedOut)timerElement.textContent='0:00';
    onRecorded({selected,answer:question.answer,timedOut}); onNext();
  }
  const confirm=app.querySelector('[data-confirm]');
  form.querySelectorAll(`input[name="${inputName}"]`).forEach((input)=>input.addEventListener('change',()=>{selectedIndex=Number(input.value);confirm.disabled=false;}));
  confirm.onclick=()=>settle(selectedIndex,false);
}

function translationHtml(translation='') { return String(translation).split(/\n\s*\n/).map((paragraph)=>`<p>${escapeHtml(paragraph)}</p>`).join(''); }

function renderQuickResult() {
  const correct = session.answers.filter((a) => a.selected === a.answer).length;
  const averageWPM = Math.round(session.passages.reduce((sum,p,i) => sum + calculateWpm(p.passage.trim().split(/\s+/).length, session.readingTimes[i]), 0) / 3);
  const nextLimit = nextTimeLimit(session.limit, correct);
  const record = { date:new Date().toISOString(), passages:session.passages, answers:session.answers, correctAnswers:correct, totalQuestions:9, accuracy:correct/9, readingTimes:session.readingTimes, averageWPM, currentTimeLimit:session.limit, nextTimeLimit:nextLimit };
  store.quickHistory.unshift(record); store.quickTimeLimit=nextLimit; saveState(store);
  renderResult('QUICK COMPLETE', `${correct}<small>/9</small>`, '正確さを保ちながら、テンポを育てる。', [['Accuracy',`${Math.round(correct/9*100)}%`],['Average WPM',averageWPM],['Time limit',`${session.limit}s → ${nextLimit}s`]],reviewHtml(session.passages,session.answers));
}

async function startLong() {
  const difficulty = selectDifficulty(store.internalRating); renderLoading('Long passageを準備中', '現在のReading Ratingに合う文章を構成しています。');
  const content = await requestContent('/api/generate-long', { difficulty,recentPassages:recentHistoryForPrompt(store.passageHistory) }, longPassage, validateLongContent);
  store.passageHistory=addPassagesToHistory(store.passageHistory,[content],difficulty); saveState(store);
  session = { mode:'long', content, difficulty, unknownWords:new Map(), phase:'reading', startedAt:nowSeconds(),readingLimit:longReadingLimitSeconds(content.passage) }; renderLongReading();
}

function renderLongReading() {
  const { content } = session;
  const paragraphs = content.passage.split(/\n\s*\n/).map((p,i) => `<p data-paragraph="${i}">${tokenizeParagraph(p)}</p>`).join('');
  app.innerHTML = `<section class="session-head"><button class="text-button" data-home>← 終了</button><div class="progress-label">LONG</div><div class="timer-pill"><span>残り時間</span><b id="timer">${fmtTime(session.readingLimit)}</b></div></section><article class="long-reading"><header class="article-header compact-article-header"><p class="eyebrow">${escapeHtml(content.topic)}</p><h1>${escapeHtml(content.title)}</h1><p class="tap-guide"><span></span> 未知語をタップ</p><p class="reading-warning" hidden>残り1分です。まもなく問題へ移ります。</p></header><div class="long-copy">${paragraphs}</div><footer class="reading-footer"><button class="primary-button dark" data-finish>読了・問題へ <span>→</span></button></footer></article>`;
  const updateTimer=()=>{const left=Math.max(0,session.readingLimit-(nowSeconds()-session.startedAt));app.querySelector('#timer').textContent=fmtTime(left);app.querySelector('.reading-warning').hidden=left>60;if(left<=0)finishLongReading(true);}; updateTimer(); session.timer=setInterval(updateTimer,250);
  app.querySelectorAll('.word-token').forEach((button)=>button.onclick=()=>toggleUnknown(button)); app.querySelector('[data-finish]').onclick=finishLongReading; app.querySelector('[data-home]').onclick=()=>{clearInterval(session.timer);renderHome();};
}

function tokenizeParagraph(text) { return text.split(/(\s+)/).map((token)=>{ if (/^\s+$/.test(token)) return token; const word=token.toLowerCase().replace(/^[^a-z]+|[^a-z'-]+$/g,''); return word ? `<button type="button" class="word-token" data-word="${escapeHtml(word)}">${escapeHtml(token)}</button>` : escapeHtml(token); }).join(''); }
function toggleUnknown(button) { const word=button.dataset.word; if(session.unknownWords.has(word)) session.unknownWords.delete(word); else {const known=session.content.vocabulary?.[word];session.unknownWords.set(word,typeof known==='string'?{contextMeaning:known,basicMeaning:known,partOfSpeech:'—',exampleSentence:`The report uses ${word} to describe its central finding.`}:known||{contextMeaning:'取得中',basicMeaning:'取得中',partOfSpeech:'—',exampleSentence:'取得中',pending:true});} document.querySelectorAll(`[data-word="${CSS.escape(word)}"]`).forEach((el)=>el.classList.toggle('unknown',session.unknownWords.has(word))); }
function finishLongReading(timedOut=false) { if(session.phase!=='reading')return; clearInterval(session.timer); session.readingTime=Math.min(session.readingLimit,Math.max(1,nowSeconds()-session.startedAt)); session.readingTimedOut=timedOut; session.phase='questions'; session.questionIndex=0; session.longAnswers=[]; renderLongQuestions(); }

function renderLongQuestions() {
  if(session.questionIndex>=session.content.questions.length){renderLongSummary();return;}
  const question=session.content.questions[session.questionIndex];
  renderTimedQuestion({mode:'long',question,index:session.questionIndex,total:5,duration:QUESTION_LIMITS.long,label:'LONG · 選択問題',confirmLabel:session.questionIndex===4?'要約へ':'次へ',onRecorded:(answer)=>session.longAnswers.push(answer),onNext:()=>{session.questionIndex+=1;renderLongQuestions();}});
}

function renderLongSummary() {
  app.innerHTML=`<section class="summary-page"><div class="step-line"><span>LONG · 日本語要約</span><span>10 points</span></div><div class="summary-prompt"><h1>日本語要約</h1><p>中心的な主張と重要な論点をまとめてください。</p></div><form>${answerInputHtml()}<p class="form-notice" hidden>40文字以上入力してください。</p><div class="sticky-action"><button class="primary-button dark" type="submit">採点する <span>→</span></button></div></form></section>`;
  session.summaryInput=mountAnswerInput(app);
  app.querySelector('form').onsubmit=submitLong;
}

async function submitLong(event) {
  event.preventDefault(); const summary=session.summaryInput.getValue(); if(summary.length<40){app.querySelector('.form-notice').hidden=false;return;}
  const mcCorrect=session.longAnswers.filter((a)=>a.selected===a.answer).length;
  renderLoading('採点中','理解の正確さと要約の質を確認しています。');
  const fallbackGrade={score:gradeSummaryLocally(summary),goodPoints:'中心的な主張を捉えようとしています。',missingPoints:'主要な対比と因果関係をもう少し明示できます。',improvements:'各段落の役割を整理し、結論につながる論理を一文ずつ残しましょう。',modelAnswer:session.content.sampleSummary};
  const [grade,unknownWords]=await Promise.all([requestContent('/api/grade-summary',{passage:session.content.passage,summary},fallbackGrade),resolveUnknownWords()]);
  const summaryScore=Math.max(0,Math.min(10,Math.round(Number(grade.score)||0))); const multipleChoiceScore=mcCorrect*3; const totalScore=multipleChoiceScore+summaryScore; const actual=totalScore/25; const expected=expectedAccuracy(store.internalRating,session.difficulty); const oldRating=store.internalRating; const ratingUpdate=updateRatingWithCalibration(oldRating,actual,expected,store.longHistory.length); const wordCount=session.content.passage.trim().split(/\s+/).length; const wpm=calculateWpm(wordCount,session.readingTime);
  const record={date:new Date().toISOString(),internalRatingBefore:oldRating,internalRatingAfter:ratingUpdate.newRating,displayRatingBefore:displayRating(oldRating),displayRatingAfter:displayRating(ratingUpdate.newRating),ratingMultiplier:ratingUpdate.multiplier,passageDifficulty:session.difficulty,passageRating:passageRating(session.difficulty),expectedAccuracy:expected,actualAccuracy:actual,totalScore,multipleChoiceScore,summaryScore,readingTime:session.readingTime,WPM:wpm,unknownWords,passage:session.content,questions:session.content.questions,answers:session.longAnswers,summary,goodPoints:grade.goodPoints,missingPoints:grade.missingPoints,improvements:grade.improvements,modelAnswer:grade.modelAnswer||session.content.sampleSummary};
  store.internalRating=ratingUpdate.newRating; store.longHistory.unshift(record); saveState(store); renderLongResult(record);
}

async function resolveUnknownWords() {
  const pending=[...session.unknownWords].filter(([,details])=>details?.pending).map(([word])=>word);
  if(pending.length){
    const fallback=pending.map((word)=>({word,contextMeaning:`本文中の「${word}」`,basicMeaning:`${word}（辞書情報を再取得してください）`,partOfSpeech:'—',exampleSentence:`The word ${word} is used naturally in this example.`}));
    const entries=await requestContent('/api/lookup-words',{passage:session.content.passage,words:pending},fallback,(value)=>Array.isArray(value)?value:fallback);
    entries.forEach(({word,...details})=>{if(session.unknownWords.has(word.toLowerCase()))session.unknownWords.set(word.toLowerCase(),details);});
  }
  return [...session.unknownWords].map(([word,details])=>({word,...details}));
}

function gradeSummaryLocally(summary) { const lengthScore=summary.length>=120?4:summary.length>=70?3:summary.length>=40?2:1; const concepts=['公共','空間','設計','多様','安全','評価','予期','意味']; return Math.min(10,lengthScore+Math.min(6,concepts.filter((word)=>summary.includes(word)).length)); }

function renderLongResult(record) {
  const vocabRows=record.unknownWords.length?record.unknownWords.map(({word,contextMeaning,basicMeaning,partOfSpeech,exampleSentence})=>`<li><b>${escapeHtml(word)}</b><span><em>意味：</em>${escapeHtml(contextMeaning)}<strong class="vocab-example">${escapeHtml(exampleSentence||'例文を取得できませんでした。')}</strong><small>基本義：${escapeHtml(basicMeaning)} · ${escapeHtml(partOfSpeech)}</small></span></li>`).join(''):'<li class="empty-row">今回は記録した単語はありません。</li>';
  app.innerHTML=`<section class="result-page"><div class="result-hero"><p class="eyebrow">LONG COMPLETE</p><div class="rating-shift"><span>${record.displayRatingBefore}</span><i>→</i><strong>${record.displayRatingAfter}</strong></div><h1>Reading Rating</h1><p>${record.internalRatingAfter>=100?'表示は100。内部Ratingは引き続き精密に更新されています。':'今回の理解度を反映しました。'}</p></div><div class="result-grid"><div class="result-stat featured"><span>Total score</span><strong>${record.totalScore}<small>/25</small></strong></div><div class="result-stat"><span>選択問題</span><strong>${record.multipleChoiceScore}<small>/15</small></strong></div><div class="result-stat"><span>日本語要約</span><strong>${record.summaryScore}<small>/10</small></strong></div><div class="result-stat"><span>Reading time</span><strong>${fmtTime(record.readingTime)}</strong></div><div class="result-stat"><span>WPM</span><strong>${record.WPM}</strong></div></div><section class="feedback-card summary-feedback"><p class="eyebrow">SUMMARY FEEDBACK</p><div><h2>自分の回答</h2><p>${escapeHtml(record.summary)}</p></div><div class="summary-score"><strong>${record.summaryScore}<small>/10</small></strong><p><b>良かった点：</b>${escapeHtml(record.goodPoints)}</p><p><b>不足したポイント：</b>${escapeHtml(record.missingPoints)}</p><p><b>改善ポイント：</b>${escapeHtml(record.improvements)}</p></div><details><summary>模範解答を見る</summary><p>${escapeHtml(record.modelAnswer)}</p></details></section><details class="review-card"><summary>選択問題・本文を復習</summary>${reviewHtml([record.passage],record.answers||[])}</details><section class="vocab-card"><div><p class="eyebrow">UNKNOWN WORDS</p><h2>今回の未知語</h2></div><ul>${vocabRows}</ul><div class="vocab-actions"><button class="primary-button" data-copy-3 ${record.unknownWords.length?'':'disabled'}>3列でコピー <span>⧉</span></button><button class="primary-button" data-copy-2 ${record.unknownWords.length?'':'disabled'}>従来2列でコピー <span>⧉</span></button></div></section><div class="result-actions"><button class="primary-button dark" data-home>ホームへ <span>→</span></button></div></section>`;
  app.querySelector('[data-home]').onclick=renderHome; mountReviewToggles();
  const copyRows=async(selector,formatter)=>{const button=app.querySelector(selector);if(!button.disabled)button.onclick=async()=>{await navigator.clipboard.writeText(record.unknownWords.map(formatter).join('\n'));button.textContent='コピーしました ✓';};};
  copyRows('[data-copy-3]',(v)=>`${v.word}\t${v.contextMeaning}\t${v.exampleSentence||''}`); copyRows('[data-copy-2]',(v)=>`${v.word}\t${v.contextMeaning}`);
}

function reviewHtml(passages,answers=[]) {
  let answerOffset=0;
  return `<div class="review-content">${passages.map((passage,passageIndex)=>{const key=`passage-${passageIndex}`;const questions=passage.questions.map((question,index)=>{const response=answers[answerOffset+index];const selected=response?.selected;const correct=selected===question.answer;const ownAnswer=selected===null||selected===undefined?'未回答':`${String.fromCharCode(65+selected)}. ${escapeHtml(question.choices[selected])}`;return `<article class="answer-review ${correct?'correct':'incorrect'}"><div class="answer-review-head"><h3>Question ${index+1}</h3><strong>${correct?'正解':'不正解'}</strong></div><p>${escapeHtml(question.prompt)}</p><dl><div><dt>自分の回答</dt><dd>${ownAnswer}</dd></div><div><dt>正解</dt><dd>${String.fromCharCode(65+question.answer)}. ${escapeHtml(question.choices[question.answer])}</dd></div></dl><details><summary>解説を見る</summary><p>${escapeHtml(question.explanation)}</p><p><b>根拠：</b>${escapeHtml(question.evidence)}</p></details></article>`;}).join('');answerOffset+=passage.questions.length;return `<details><summary>${escapeHtml(passage.title||passage.topic)}：回答と本文</summary>${questions}<section class="passage-review"><div class="review-toggle" role="group" aria-label="本文表示"><button type="button" class="active" data-review-view="original" data-review-key="${key}">原文</button><button type="button" data-review-view="translation" data-review-key="${key}">和訳</button></div><div data-review-panel="original" data-review-key="${key}"><h3>Original</h3>${translationHtml(passage.passage)}</div><div data-review-panel="translation" data-review-key="${key}" hidden><h3>日本語訳</h3>${translationHtml(passage.translation)}</div></section></details>`;}).join('')}</div>`;
}

function mountReviewToggles() { app.querySelectorAll('[data-review-view]').forEach((button)=>button.onclick=()=>{const key=button.dataset.reviewKey;app.querySelectorAll(`[data-review-key="${key}"][data-review-view]`).forEach((item)=>item.classList.toggle('active',item===button));app.querySelectorAll(`[data-review-key="${key}"][data-review-panel]`).forEach((panel)=>{panel.hidden=panel.dataset.reviewPanel!==button.dataset.reviewView;});}); }

function questionsHtml(questions,prefix) { return questions.map((q,i)=>`<fieldset class="question-card"><legend><span>${String(i+1).padStart(2,'0')}</span>${escapeHtml(q.prompt)}</legend><div class="choice-list">${q.choices.map((choice,j)=>`<label><input type="radio" name="${prefix}-${i}" value="${j}"><span class="choice-marker">${String.fromCharCode(65+j)}</span><span>${escapeHtml(choice)}</span></label>`).join('')}</div></fieldset>`).join(''); }
function choiceHtml(question,name) { return question.choices.map((choice,index)=>`<label><input type="radio" name="${name}" value="${index}"><span class="choice-marker">${String.fromCharCode(65+index)}</span><span>${escapeHtml(choice)}</span></label>`).join(''); }
function validateAnswered(form,count) { const answered=new Set([...new FormData(form).keys()].filter((key)=>key!=='summary')).size; if(answered<count){form.querySelector('.form-notice')?.remove();form.insertAdjacentHTML('afterbegin','<p class="form-notice">すべての問題に回答してください。</p>');return false;}return true; }
function renderResult(kicker,score,subcopy,stats,extra='') { app.innerHTML=`<section class="result-page compact-result"><div class="result-hero quick-result"><p class="eyebrow">${kicker}</p><div class="result-score">${score}</div><p>${subcopy}</p></div><div class="result-grid">${stats.map(([label,value],i)=>`<div class="result-stat ${i===0?'featured':''}"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>${extra?`<details class="review-card"><summary>回答・解説・本文を復習</summary>${extra}</details>`:''}<div class="result-actions"><button class="primary-button" data-again>もう一度 <span>↻</span></button><button class="primary-button dark" data-home>ホーム <span>→</span></button></div></section>`;app.querySelector('[data-again]').onclick=startQuick;app.querySelector('[data-home]').onclick=renderHome;mountReviewToggles(); }
function renderLoading(title,detail) { app.innerHTML=`<section class="loading-view"><div class="loader-ring"></div><p class="eyebrow">PLEASE WAIT</p><h1 class="section-title">${title}</h1><p>${detail}</p></section>`; }

function renderProfile() {
  activeQuestionTimerCancel(); activeQuestionTimerCancel=()=>{};
  const quick=store.quickHistory; const long=store.longHistory; const recentWpm=quick[0]?.averageWPM||'—'; const bestWpm=quick.length?Math.max(...quick.map((item)=>item.averageWPM)):0; const averageWpm=quick.length?Math.round(quick.reduce((sum,item)=>sum+item.averageWPM,0)/quick.length):0;
  app.innerHTML=`<section class="profile-page"><div class="profile-rating"><p>Reading Rating</p><strong>${displayRating(store.internalRating)}</strong>${long.length<RATING.calibrationSessions?`<small>初回調整 ${long.length}/${RATING.calibrationSessions}</small>`:''}</div><div class="profile-stats"><article><span>Long</span><strong>${long.length}</strong><small>sessions</small></article><article><span>Recent WPM</span><strong>${recentWpm}</strong><small>Quick</small></article><article><span>Best WPM</span><strong>${bestWpm||'—'}</strong><small>Avg ${averageWpm||'—'}</small></article><article><span>Total</span><strong>${long.length+quick.length}</strong><small>sessions</small></article></div><div class="profile-links"><button class="primary-button" data-history="long">Long 履歴 <span>→</span></button><button class="primary-button" data-history="quick">Quick 履歴 <span>→</span></button></div><details class="settings-panel"><summary>設定</summary><div class="settings-content"><div><strong>最初から始める</strong><p>履歴とRatingを削除し、初期Ratingの選択に戻ります。</p></div><button type="button" class="danger-button" data-reset>最初から</button><div class="reset-confirm" hidden><p>すべての学習データを削除します。元に戻せません。</p><button type="button" data-cancel-reset>キャンセル</button><button type="button" class="danger-button" data-confirm-reset>削除して最初から</button></div></div></details><button class="text-button profile-home" data-home>← ホーム</button></section>`;
  app.querySelectorAll('[data-history]').forEach((button)=>button.onclick=()=>renderHistory(button.dataset.history)); app.querySelector('[data-home]').onclick=renderHome;
  const confirm=app.querySelector('.reset-confirm'); app.querySelector('[data-reset]').onclick=()=>{confirm.hidden=false;}; app.querySelector('[data-cancel-reset]').onclick=()=>{confirm.hidden=true;}; app.querySelector('[data-confirm-reset]').onclick=()=>{resetState();localStorage.removeItem('reading-rating-input-mode');store={...defaultState,longHistory:[],quickHistory:[]};renderRatingSetup();};
}

function renderHistory(filter='all') {
  const longRows=filter==='quick'?[]:store.longHistory.map((r)=>`<tr><td>${new Date(r.date).toLocaleDateString('ja-JP')}</td><td>Long</td><td>${r.displayRatingBefore} → ${r.displayRatingAfter}</td><td>${r.totalScore}/25</td><td>${r.WPM} WPM</td></tr>`); const quickRows=filter==='long'?[]:store.quickHistory.map((r)=>`<tr><td>${new Date(r.date).toLocaleDateString('ja-JP')}</td><td>Quick</td><td>—</td><td>${r.correctAnswers}/9</td><td>${r.averageWPM} WPM</td></tr>`); const rows=[...longRows,...quickRows].join('')||'<tr><td colspan="5" class="empty-row">履歴はまだありません。</td></tr>';
  app.innerHTML=`<section class="history-page compact-history"><header><p class="eyebrow">${filter.toUpperCase()} HISTORY</p><h1>${filter==='long'?'Long':'Quick'} 履歴</h1></header><div class="table-wrap"><table><thead><tr><th>Date</th><th>Mode</th><th>Rating</th><th>Score</th><th>Speed</th></tr></thead><tbody>${rows}</tbody></table></div><button class="text-button" data-profile>← プロフィール</button></section>`;app.querySelector('[data-profile]').onclick=renderProfile;
}

document.querySelector('.profile-button').onclick=()=>renderProfile(); document.querySelector('.brand').onclick=(event)=>{event.preventDefault();renderHome();}; renderHome();
