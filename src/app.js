import { defaultState, loadState, resetState, saveState } from '../lib/storage.js';
import { displayRating, expectedAccuracy, passageRating, updateRatingWithCalibration } from '../lib/rating.js';
import { RATING } from '../lib/config.js';
import { calculateWpm, nextRecentTimeLimit } from '../lib/quick.js';
import { QUESTION_LIMITS, longReadingLimitSeconds } from '../lib/assessment.js';
import { loadLongTranslation } from '../lib/translation.js';
import { LONG_SCORING, scoreLong, longScoreMax, longChoiceMax } from '../lib/long-scoring.js';
import { addPassagesToHistory } from '../lib/passage-history.js';
import { createLongGenerationContext, createQuickGenerationContext } from '../lib/generation.js';
import { loadBank, chooseLongLevel, takeBankItems, adaptQuick, adaptLong, isCorrectAnswer } from '../lib/question-bank.js';
import { normalizeSummaryGrade } from '../lib/summary-scoring.js';
import { answerInputHtml, mountAnswerInput } from './answer-input.js';
import { isJapaneseMeaning, normalizeUnknownWord, normalizeUnknownWords, historyRecordId } from '../lib/history-format.js';
import { putSession, deleteSession, clearSessions, hydrateHistory } from '../lib/history-db.js';
import { needsConciseMeaning, repairConciseMeanings } from '../lib/vocabulary-meaning.js';
import { passageWordTokens, vocabularyFromSelection, resolveSelectedVocabulary } from '../lib/expression-selection.js';

const app = document.querySelector('#app');
let store = loadState();
let session = null;
let historyHydrated = false;
let activeQuestionTimerCancel = () => {};
const fmtTime = (seconds) => { const value=Math.max(0,Math.ceil(seconds)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`; };
const escapeHtml = (value='') => value.replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const nowSeconds = () => performance.now() / 1000;

function renderHome() {
  if(session?.timer)clearInterval(session.timer);
  session=null;
  activeQuestionTimerCancel(); activeQuestionTimerCancel=()=>{};
  document.body.classList.remove('question-active');
  document.title = 'Reading Rating ver 2.1';
  if (store.internalRating === null || store.internalRating === undefined) { renderRatingSetup(); return; }
  app.innerHTML = `<section class="compact-home"><div class="home-heading"><p class="eyebrow">VER 2.1</p><h1>Choose a mode</h1></div><div class="compact-mode-grid" aria-label="トレーニングモード"><article class="compact-mode quick-mode"><h2>Quick</h2><button class="primary-button dark" data-start="quick">始める <span>→</span></button></article><article class="compact-mode long-mode"><h2>Long</h2><button class="primary-button dark" data-start="long">始める <span>→</span></button></article></div></section>`;
  app.querySelector('[data-start="quick"]').onclick = startQuick;
  app.querySelector('[data-start="long"]').onclick = startLong;
  if(store.pendingLong){app.insertAdjacentHTML('beforeend','<section class="review-card"><p>採点保留の要約があります。Ratingは未更新です。</p><button class="primary-button" data-resume-grade>採点を再開する</button></section>');app.querySelector('[data-resume-grade]').onclick=resumePendingLong;}
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
  activeQuestionTimerCancel(); activeQuestionTimerCancel=()=>{}; document.body.classList.remove('question-active');
  const context=createQuickGenerationContext(); session={mode:'quick',...context,phase:'generating',passages:null};
  renderLoading('Quick setを準備中', '問題バンクから3つの本文を読み込んでいます。');
  try {
  const bank=await loadBank('quick');
  if(session?.sessionId!==context.sessionId)return;
  const selection=takeBankItems(bank,store.bankProgress?.quick,3);
  const passages=selection.items.map(p=>adaptQuick(p));
  store.bankProgress={...store.bankProgress,quick:selection.progress};
  store.passageHistory=addPassagesToHistory(store.passageHistory,passages,'quick'); saveState(store);
  session = { mode:'quick', ...context, passages, passageIndex:0, answers:[], readingTimes:[], phase:'ready', limit:store.quickTimeLimit };
  renderReadingReady();
  } catch {
    if(session?.sessionId!==context.sessionId)return;
    session=null;
    app.innerHTML=`<section class="generation-error" role="alert"><p class="eyebrow">BANK LOAD ERROR</p><h1>問題の読み込みに失敗しました。</h1><p>通信状況を確認して、再試行してください。</p><div><button class="primary-button dark" data-retry-quick>再試行する ↻</button><button class="text-button" data-home>ホームへ戻る</button></div></section>`;
    app.querySelector('[data-retry-quick]').onclick=startQuick; app.querySelector('[data-home]').onclick=renderHome;
  }
}

function renderReadingReady() {
  session.phase='ready';
  const currentSession=session;
  const label=session.mode==='quick'?`QUICK ${session.passageIndex+1} / 3`:'LONG';
  app.innerHTML=`<section class="reading-ready"><p class="eyebrow">${label}</p><h1>準備ができました</h1><p>開始すると本文が表示され、時間の計測が始まります。</p><button class="primary-button dark" data-begin-reading>開始する <span>→</span></button><button class="text-button" data-home>← ホーム</button></section>`;
  app.querySelector('[data-begin-reading]').onclick=()=>{if(session!==currentSession||session.phase!=='ready')return;session.phase='reading';session.startedAt=nowSeconds();session.mode==='quick'?renderQuickReading():renderLongReading();};
  app.querySelector('[data-home]').onclick=()=>{session=null;renderHome();};
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
  renderTimedQuestion({mode:'quick',question,index:session.questionIndex,total:3,duration:QUESTION_LIMITS.quick,label:`QUICK ${session.passageIndex+1}/3`,confirmLabel:finalQuestion?'採点する':'次へ',onRecorded:(answer)=>session.answers.push(answer),onNext:()=>{session.questionIndex+=1;if(session.questionIndex<3)renderQuickQuestions();else{session.passageIndex+=1;session.passageIndex<3?renderReadingReady():renderQuickResult();}}});
}

function renderTimedQuestion({mode,question,index,total,duration,label,confirmLabel='次へ',onRecorded,onNext}) {
  activeQuestionTimerCancel();
  document.body.classList.add('question-active');
  const inputName=`${mode}-answer`; let selectedIndex=null; let settled=false; let remainingTime=duration*1000; let timerId=null; let startTimestamp=null; let deadlineTimestamp=null;
  app.innerHTML=`<div class="question-toolbar fixed-question-timer"><span>${label} · Question ${index+1} / ${total}</span><div class="question-timer" aria-live="polite"><span>残り</span><strong id="question-timer">${fmtTime(duration)}</strong></div></div><section class="focus-question"><form><div class="question-scroll"><fieldset class="question-card single-question"><legend>${escapeHtml(question.prompt)}</legend><div class="choice-list">${choiceHtml(question,inputName)}</div></fieldset></div><div class="question-action"><button class="primary-button dark" type="button" data-confirm disabled>${confirmLabel} <span>→</span></button></div></form></section>`;
  const form=app.querySelector('form'); const timerElement=app.querySelector('#question-timer'); const warningAt=mode==='quick'?10:15;
  const cancelTimer=()=>{if(timerId!==null){clearInterval(timerId);timerId=null;}}; activeQuestionTimerCancel=cancelTimer;
  const tick=()=>{if(settled||deadlineTimestamp===null)return;remainingTime=Math.max(0,deadlineTimestamp-Date.now());timerElement.textContent=fmtTime(remainingTime/1000);timerElement.closest('.question-toolbar').classList.toggle('warning',remainingTime<=warningAt*1000);if(remainingTime<=0)settle(selectedIndex,true);};
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(settled)return;startTimestamp=Date.now();deadlineTimestamp=startTimestamp+duration*1000;remainingTime=duration*1000;timerElement.textContent=fmtTime(duration);timerId=setInterval(tick,200);tick();}));
  function settle(selected,timedOut=false) {
    if(settled)return; settled=true; cancelTimer(); activeQuestionTimerCancel=()=>{}; if(timedOut)timerElement.textContent='0:00';
    document.body.classList.remove('question-active'); onRecorded({selected,answer:question.answer,selectedId:selected===null?null:question.choiceIds?.[selected],answerId:question.correctChoiceId,timedOut}); onNext();
  }
  const confirm=app.querySelector('[data-confirm]');
  form.querySelectorAll(`input[name="${inputName}"]`).forEach((input)=>input.addEventListener('change',()=>{selectedIndex=Number(input.value);confirm.disabled=false;}));
  confirm.onclick=()=>settle(selectedIndex,false);
}

function translationHtml(translation='') { return String(translation).split(/\n\s*\n/).map((paragraph)=>`<p>${escapeHtml(paragraph)}</p>`).join(''); }

function renderQuickResult() {
  const correct = session.answers.filter(isCorrectAnswer).length;
  const averageWPM = Math.round(session.passages.reduce((sum,p,i) => sum + calculateWpm(p.wordCount||p.passage.trim().split(/\s+/).length, session.readingTimes[i]), 0) / 3);
  const nextLimit = nextRecentTimeLimit(session.limit, correct, store.quickHistory);
  const record = { id:`quick-${Date.now()}-${Math.random().toString(36).slice(2)}`, date:new Date().toISOString(), passages:session.passages, answers:session.answers, questions:session.passages.flatMap((p)=>p.questions), correctAnswers:correct, totalQuestions:9, accuracy:correct/9, readingTimes:session.readingTimes, averageWPM, currentTimeLimit:session.limit, nextTimeLimit:nextLimit, unknownWords:[] };
  store.quickHistory.unshift(record); store.quickTimeLimit=nextLimit; saveState(store);
  void putSession('quick', record);
  renderResult('QUICK COMPLETE', `${correct}<small>/9</small>`, '正確さを保ちながら、テンポを育てる。', [['Accuracy',`${Math.round(correct/9*100)}%`],['Average WPM',averageWPM],['Time limit',`${session.limit}s → ${nextLimit}s`]],reviewHtml(session.passages,session.answers));
}

async function startLong() {
  if(store.pendingLong&&!window.confirm('採点保留の要約を破棄して、新しくLongを始めますか？')){resumePendingLong();return;}
  if(store.pendingLong){delete store.pendingLong;saveState(store);}
  activeQuestionTimerCancel(); activeQuestionTimerCancel=()=>{}; document.body.classList.remove('question-active'); session=null;
  const difficulty=chooseLongLevel(store.internalRating); const context=createLongGenerationContext();
  session={mode:'long',...context,difficulty,content:null,phase:'loading'}; renderLoading('Long passageを準備中','問題バンクから文章を読み込んでいます。');
  try {
    const bank=await loadBank('long',difficulty);
    if(session?.sessionId!==context.sessionId)return;
    const selection=takeBankItems(bank,store.bankProgress?.long?.[difficulty],1);
    const content=adaptLong(selection.items[0]);
    content.translation=await loadLongTranslation(content.bankId);
    if(session?.sessionId!==context.sessionId)return;
    store.bankProgress={...store.bankProgress,long:{...store.bankProgress?.long,[difficulty]:selection.progress}};
    store.passageHistory=addPassagesToHistory(store.passageHistory,[content],difficulty); saveState(store);
    session={...session,content,unknownWords:new Map(),selectedTokenIndices:new Set(),phase:'ready',readingLimit:longReadingLimitSeconds(content.passage)}; renderReadingReady();
  } catch {
    if(session?.sessionId===context.sessionId)renderLongGenerationError();
  }
}

function renderLongGenerationError() {
  session=null;
  app.innerHTML=`<section class="generation-error" role="alert"><p class="eyebrow">BANK LOAD ERROR</p><h1>問題の読み込みに失敗しました。</h1><p>通信状況を確認して、もう一度お試しください。</p><div><button class="primary-button dark" data-retry-long>再試行する <span>↻</span></button><button class="text-button" data-home>ホームへ戻る</button></div></section>`;
  app.querySelector('[data-retry-long]').onclick=startLong; app.querySelector('[data-home]').onclick=renderHome;
}

function renderLongReading() {
  const { content } = session;
  let tokenIndex=0;
  const paragraphs = content.passage.split(/\n\s*\n/).map((p,i) => `<p data-paragraph="${i}">${tokenizeParagraph(p,()=>tokenIndex++)}</p>`).join('');
  app.innerHTML = `<section class="long-reader-shell"><header class="long-reader-bar"><div><button class="text-button" data-home>← 終了</button><span class="passage-level">Level ${session.difficulty}</span></div><div class="timer-pill"><span>残り時間</span><b id="timer">${fmtTime(session.readingLimit)}</b></div></header><article class="long-passage-scroll"><header class="article-header compact-article-header"><p class="eyebrow">${escapeHtml(content.topic)}</p><h1>${escapeHtml(content.title)}</h1><p class="tap-guide"><span></span> 未知語をタップ</p><p class="reading-warning" hidden>残り1分です。まもなく問題へ移ります。</p></header><div class="long-copy">${paragraphs}</div></article><footer class="long-reader-action"><button class="primary-button dark" data-finish>読了・問題へ <span>→</span></button></footer></section>`;
  const updateTimer=()=>{const left=Math.max(0,session.readingLimit-(nowSeconds()-session.startedAt));app.querySelector('#timer').textContent=fmtTime(left);app.querySelector('.reading-warning').hidden=left>60;if(left<=0)finishLongReading(true);}; updateTimer(); session.timer=setInterval(updateTimer,250);
  app.querySelectorAll('.word-token').forEach((button)=>button.onclick=()=>toggleUnknown(button)); app.querySelector('[data-finish]').onclick=finishLongReading; app.querySelector('[data-home]').onclick=()=>{clearInterval(session.timer);renderHome();};
}

function tokenizeParagraph(text,nextIndex) {
  let cursor=0;const pieces=[];
  for(const token of passageWordTokens(text)){
    pieces.push(escapeHtml(text.slice(cursor,token.start)),`<button type="button" class="word-token" data-word="${escapeHtml(token.word)}" data-token-index="${nextIndex()}" aria-pressed="false">${escapeHtml(token.text)}</button>`);cursor=token.end;
  }
  pieces.push(escapeHtml(text.slice(cursor)));return pieces.join('');
}
function toggleUnknown(button) {
  const index=Number(button.dataset.tokenIndex),selected=session.selectedTokenIndices;
  selected.has(index)?selected.delete(index):selected.add(index);
  const previous=session.unknownWords;
  session.unknownWords=new Map(vocabularyFromSelection(session.content.passage,[...selected]).map(word=>{
    const known=previous.get(word)||session.content.vocabulary?.[word];
    const rawMeaning=typeof known==='string'?known:known?.generalMeaning||known?.basicMeaning||known?.contextMeaning;
    return [word,normalizeUnknownWord({...(typeof known==='string'?{generalMeaning:known}:known),word,pending:!known||!isJapaneseMeaning(rawMeaning)})];
  }));
  button.classList.toggle('unknown',selected.has(index));button.setAttribute('aria-pressed',String(selected.has(index)));
}
function finishLongReading(timedOut=false) { if(session.phase!=='reading')return; clearInterval(session.timer); session.readingTime=Math.min(session.readingLimit,Math.max(1,nowSeconds()-session.startedAt)); session.readingTimedOut=timedOut; session.phase='questions'; session.questionIndex=0; session.longAnswers=[]; renderLongQuestions(); }

function renderLongQuestions() {
  if(session.questionIndex>=session.content.questions.length){renderLongSummary();return;}
  const question=session.content.questions[session.questionIndex];
  renderTimedQuestion({mode:'long',question,index:session.questionIndex,total:5,duration:QUESTION_LIMITS.long,label:'LONG · 選択問題',confirmLabel:session.questionIndex===4?'要約へ':'次へ',onRecorded:(answer)=>session.longAnswers.push(answer),onNext:()=>{session.questionIndex+=1;renderLongQuestions();}});
}

function renderLongSummary() {
  session.phase='summary';
  app.innerHTML=`<section class="summary-page"><div class="step-line"><span>LONG · 日本語要約</span><span>10 points</span></div><div class="summary-prompt"><h1>日本語要約</h1><p>中心的な主張と重要な論点をまとめてください。</p></div><form>${answerInputHtml()}<p class="form-notice" hidden>40文字以上入力してください。</p><div class="sticky-action"><button class="primary-button dark" type="submit">採点する <span>→</span></button></div></form></section>`;
  session.summaryInput=mountAnswerInput(app);
  app.querySelector('form').onsubmit=submitLong;
}

async function submitLong(event) {
  event.preventDefault(); const current=session;
  if(!current||current.submitting||current.committed)return;
  const summary=current.phase==='summary'?current.summaryInput.getValue():current.summaryDraft;
  if(!summary||summary.length<40){app.querySelector('.form-notice').hidden=false;return;}
  current.summaryDraft=summary; current.submitting=true; current.phase='grading';
  try {
  store.pendingLong={sessionId:current.sessionId,generationId:current.generationId,mode:'long',content:current.content,difficulty:current.difficulty,longAnswers:current.longAnswers,readingTime:current.readingTime,readingLimit:current.readingLimit,summaryDraft:summary,unknownWords:[...current.unknownWords],...(current.selectedTokenIndices?{selectedTokenIndices:[...current.selectedTokenIndices],expressionsResolved:Boolean(current.expressionsResolved)}:{}),phase:'grading-pending'};
  saveState(store);
  const mcCorrect=current.longAnswers.filter(isCorrectAnswer).length;
  renderLoading('採点中','理解の正確さと要約の質を確認しています。');
  const unknownWords=await resolveUnknownWords(current);
  if(session!==current)return;
  Object.assign(store.pendingLong,{unknownWords:[...current.unknownWords],expressionsResolved:Boolean(current.expressionsResolved)});saveState(store);
  const response=await fetch('/api/grade-summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passage:current.content.passage,summary,sessionId:current.sessionId})});
  if(!response.ok)throw new Error('Summary grading unavailable');
  const gradeResponse=await response.json();
  normalizeSummaryGrade(gradeResponse);
  if(session!==current)return;
  const prior=store.longHistory.find(r=>r.id===current.sessionId);if(prior){current.committed=true;renderLongResult(prior);return;}
  const grade=normalizeSummaryGrade(gradeResponse); const {summaryScore,multipleChoiceScore,totalScore,actualAccuracy:actual}=scoreLong(mcCorrect,grade.rawScore); const expected=expectedAccuracy(store.internalRating,session.difficulty); const oldRating=store.internalRating; const ratingUpdate=updateRatingWithCalibration(oldRating,actual,expected,store.longHistory.length); const wordCount=session.content.passage.trim().split(/\s+/).length; const wpm=calculateWpm(wordCount,session.readingTime);
  const record={id:current.sessionId,date:new Date().toISOString(),title:session.content.title,originalPassage:session.content.passage,japaneseTranslation:session.content.translation,internalRatingBefore:oldRating,internalRatingAfter:ratingUpdate.newRating,displayRatingBefore:displayRating(oldRating),displayRatingAfter:displayRating(ratingUpdate.newRating),ratingMultiplier:ratingUpdate.multiplier,passageDifficulty:session.difficulty,passageRating:passageRating(session.difficulty),expectedAccuracy:expected,actualAccuracy:actual,totalScore,multipleChoiceScore,summaryScore,summaryDisplayScore:summaryScore,summaryElementScore:grade.elementScore,summaryImpressionScore:grade.impressionScore,rawSummaryScore:grade.rawScore,summaryElements:grade.elements,readingTime:session.readingTime,WPM:wpm,unknownWords:normalizeUnknownWords(unknownWords),passage:session.content,questions:session.content.questions,answers:session.longAnswers,summary,goodPoints:grade.goodPoints,missingPoints:grade.missingPoints,improvements:grade.improvements,feedback:grade.feedback,modelAnswer:grade.modelSummary||session.content.sampleSummary,sampleSummary:session.content.sampleSummary};
  Object.assign(record,{scoringVersion:LONG_SCORING.version,scoreMax:LONG_SCORING.scoreMax,multipleChoiceMax:LONG_SCORING.multipleChoiceMax,pointsPerQuestion:LONG_SCORING.pointsPerQuestion});
  const nextStore={...store,internalRating:ratingUpdate.newRating,longHistory:[record,...store.longHistory]};delete nextStore.pendingLong;
  saveState(nextStore);store=nextStore;current.committed=true;void putSession('long', record);renderLongResult(record);
  } catch {
    if(session===current){current.submitting=false;current.phase='grading-pending';renderGradingPending();}
  }
}

function resumePendingLong() {
  if(!store.pendingLong)return;
  session={...store.pendingLong,unknownWords:new Map(store.pendingLong.unknownWords),...(store.pendingLong.selectedTokenIndices?{selectedTokenIndices:new Set(store.pendingLong.selectedTokenIndices)}:{}),submitting:false};renderGradingPending();
}

function renderGradingPending() {
  app.innerHTML='<section class="generation-error" role="alert"><h1>要約の採点は保留中です</h1><p>Rating・履歴はまだ更新していません。通信状況を確認して再試行してください。</p><button class="primary-button dark" data-retry-grade>採点を再試行する</button><button class="text-button" data-edit-summary>要約を修正する</button><button class="text-button" data-home>ホームへ戻る</button></section>';
  app.querySelector('[data-retry-grade]').onclick=submitLong;
  if(session?.expressionLookupFailed){app.querySelector('h1').textContent='熟語の確認に失敗しました';app.querySelector('p').textContent='選択した語は保持しています。Rating・履歴はまだ更新していません。再試行してください。';app.querySelector('[data-retry-grade]').textContent='熟語の確認・採点を再試行する';}
  app.querySelector('[data-edit-summary]').onclick=()=>{const draft=session.summaryDraft;renderLongSummary();session.summaryInput.setValue(draft);};
  app.querySelector('[data-home]').onclick=renderHome;
}

async function resolveUnknownWords(current=session) {
  if(current.selectedTokenIndices&&!current.expressionsResolved){
    let words;
    try{words=await resolveSelectedVocabulary(current.content.passage,[...current.selectedTokenIndices]);}
    catch{current.expressionLookupFailed=true;throw Error('Expression classification unavailable');}
    current.expressionLookupFailed=false;
    const previous=current.unknownWords;
    current.unknownWords=new Map(words.map(word=>[word,previous.get(word)||{pending:true}]));current.expressionsResolved=true;
  }
  const pending=[...current.unknownWords].filter(([,details])=>details?.pending||needsConciseMeaning(details)).map(([word])=>word);
  if(pending.length){
    const fallback=pending.map((word)=>({word,generalMeaning:'意味を取得できませんでした',exampleSentence:`The word ${word} is used naturally in this example.`}));
    const entries=[];
    for(let start=0;start<pending.length;start+=40){const words=pending.slice(start,start+40);entries.push(...await requestContent('/api/lookup-words',{passage:current.content.passage,words},fallback.filter(entry=>words.includes(entry.word)),(value)=>Array.isArray(value)?value:fallback.filter(entry=>words.includes(entry.word))));}
    entries.forEach(({word,...details})=>{if(current.unknownWords.has(word.toLowerCase()))current.unknownWords.set(word.toLowerCase(),details);});
  }
  return normalizeUnknownWords([...current.unknownWords].map(([word,details])=>({word,...details})));
}

function renderLongResult(record) {
  record.unknownWords=(record.unknownWords||[]).map(entry=>({...entry,...normalizeUnknownWord(entry)}));
  const vocabRows=record.unknownWords.length?record.unknownWords.map(({word,generalMeaning,exampleSentence})=>`<li><b>${escapeHtml(word)}</b><span><em>基本義：</em>${escapeHtml(generalMeaning)}<strong class="vocab-example">${escapeHtml(exampleSentence||'例文を取得できませんでした。')}</strong></span></li>`).join(''):'<li class="empty-row">今回は記録した単語はありません。</li>';
  app.innerHTML=`<section class="result-page"><div class="result-hero"><p class="eyebrow">LONG COMPLETE</p><div class="rating-shift"><span>${record.displayRatingBefore}</span><i>→</i><strong>${record.displayRatingAfter}</strong></div><h1>Reading Rating</h1><p>${record.internalRatingAfter>=100?'表示は100。内部Ratingは引き続き精密に更新されています。':'今回の理解度を反映しました。'}</p></div><div class="result-grid"><div class="result-stat featured"><span>Total score</span><strong>${record.totalScore}<small>/${longScoreMax(record)}</small></strong></div><div class="result-stat"><span>選択問題</span><strong>${record.multipleChoiceScore}<small>/${longChoiceMax(record)}</small></strong></div><div class="result-stat"><span>日本語要約</span><strong>${record.summaryScore}<small>/10</small></strong></div><div class="result-stat"><span>Reading time</span><strong>${fmtTime(record.readingTime)}</strong></div><div class="result-stat"><span>WPM</span><strong>${record.WPM}</strong></div></div><section class="feedback-card summary-feedback"><p class="eyebrow">SUMMARY FEEDBACK</p><div><h2>自分の回答</h2><p>${escapeHtml(record.summary)}</p></div><div class="summary-score"><strong>${record.summaryScore}<small>/10</small></strong><p><b>良かった点：</b>${escapeHtml(record.goodPoints)}</p><p><b>不足したポイント：</b>${escapeHtml(record.missingPoints)}</p><p><b>改善ポイント：</b>${escapeHtml(record.improvements)}</p></div><details><summary>模範解答を見る</summary><p>${escapeHtml(record.modelAnswer)}</p></details></section><details class="review-card"><summary>選択問題・本文を復習</summary>${reviewHtml([record.passage],record.answers||[])}</details><section class="vocab-card"><div><p class="eyebrow">UNKNOWN WORDS</p><h2>今回の未知語</h2></div><ul>${vocabRows}</ul><div class="vocab-actions"><button class="primary-button" data-copy-3 ${record.unknownWords.length?'':'disabled'}>3列でコピー <span>⧉</span></button><button class="primary-button" data-copy-2 ${record.unknownWords.length?'':'disabled'}>従来2列でコピー <span>⧉</span></button></div></section><div class="result-actions"><button class="primary-button dark" data-home>ホームへ <span>→</span></button></div></section>`;
  app.querySelector('[data-home]').onclick=renderHome; mountReviewToggles();
  const copyRows=async(selector,formatter)=>{const button=app.querySelector(selector);if(!button.disabled)button.onclick=async()=>{await navigator.clipboard.writeText(record.unknownWords.map(formatter).join('\n'));button.textContent='コピーしました ✓';};};
  // Legacy contextMeaning is retained internally for older snapshots; Vocabstar output uses the concrete generalMeaning.
  // Previous format: `${v.word}\t${v.contextMeaning}\t${v.exampleSentence||''}`
  copyRows('[data-copy-3]',(v)=>`${v.word}\t${v.generalMeaning}\t${v.exampleSentence||''}`); copyRows('[data-copy-2]',(v)=>`${v.word}\t${v.generalMeaning}`);
  mountConciseVocabulary(record,'long',record.unknownWords);
}

const meaningRepairJobs=new WeakMap();
function mountConciseVocabulary(record,mode,entries){
  if(!entries.some(needsConciseMeaning))return;
  const card=app.querySelector('.vocab-card');if(!card)return;
  const list=card.querySelector('ul'),buttons=[...card.querySelectorAll('button')];
  const status=document.createElement('p');status.setAttribute('role','status');status.style.gridColumn='1 / -1';card.insertBefore(status,list);
  const retry=document.createElement('button');retry.type='button';retry.className='text-button';retry.textContent='短い訳語を再取得';retry.style.gridColumn='1 / -1';retry.hidden=true;card.append(retry);
  const draw=()=>{list.innerHTML=entries.map(entry=>`<li><b>${escapeHtml(entry.word)}</b><span><em>基本義：</em>${needsConciseMeaning(entry)?'訳語を取得中…':escapeHtml(entry.generalMeaning)}<strong class="vocab-example">${escapeHtml(entry.exampleSentence||'')}</strong></span></li>`).join('');};
  const run=async()=>{
    buttons.forEach(button=>button.disabled=true);retry.hidden=true;status.textContent='すべての単語を短い訳語に更新しています…';draw();
    let job=meaningRepairJobs.get(record);
    if(!job){job=repairConciseMeanings(entries,record.originalPassage||record.passage?.passage||'');meaningRepairJobs.set(record,job);}
    const updated=await job;if(meaningRepairJobs.get(record)===job)meaningRepairJobs.delete(record);
    const originals=record.unknownWords||[];
    entries.splice(0,entries.length,...updated.entries.map((entry,index)=>({...originals[index],...entry})));record.unknownWords=entries;
    const history=mode==='long'?store.longHistory:store.quickHistory;
    let localSaveFailed=false;
    if(history.includes(record)){record.id=record.id||historyRecordId(mode,record,history.indexOf(record));try{saveState(store);}catch{localSaveFailed=true;}void putSession(mode,record);}
    if(!card.isConnected)return;
    draw();const complete=updated.unresolved.length===0;
    status.textContent=complete?(localSaveFailed?'短い訳語に更新しました。端末の保存容量も確認してください。':'短い訳語に更新しました。'):'一部の訳語を取得できませんでした。再取得してください。';
    if(!complete)list.querySelectorAll('li').forEach((row,index)=>{if(needsConciseMeaning(entries[index]))row.querySelector('span').innerHTML=`<em>基本義：</em>訳語を取得できませんでした<strong class="vocab-example">${escapeHtml(entries[index].exampleSentence||'')}</strong>`;});
    buttons.forEach(button=>button.disabled=!complete);retry.hidden=complete;
  };
  retry.onclick=()=>{void run();};void run();
}

let reviewTranslationIds=new Map();
function reviewHtml(passages,answers=[]) {
  reviewTranslationIds=new Map(passages.map((passage,index)=>[`passage-${index}`,passage.bankId||passage.id]).filter(([,id])=>/^L[0-9]-\d{3}$/.test(id)));
  let answerOffset=0;
  return `<div class="review-content">${passages.map((passage,passageIndex)=>{const key=`passage-${passageIndex}`;const questions=passage.questions.map((question,index)=>{const response=answers[answerOffset+index];const selected=response?.selected;const correct=selected===question.answer;const ownAnswer=selected===null||selected===undefined?'未回答':`${String.fromCharCode(65+selected)}. ${escapeHtml(question.choices[selected])}`;return `<article class="answer-review ${correct?'correct':'incorrect'}"><div class="answer-review-head"><h3>Question ${index+1}</h3><strong>${correct?'正解':'不正解'}</strong></div><p>${escapeHtml(question.prompt)}</p><dl><div><dt>自分の回答</dt><dd>${ownAnswer}</dd></div><div><dt>正解</dt><dd>${String.fromCharCode(65+question.answer)}. ${escapeHtml(question.choices[question.answer])}</dd></div></dl>${question.promptJa?`<details><summary>和訳を見る</summary><p>${escapeHtml(question.promptJa)}</p><ol class="choice-ja" type="A">${question.choicesJa.map(text=>`<li>${escapeHtml(text)}</li>`).join('')}</ol></details>`:`<details><summary>解説を見る</summary><p>${escapeHtml(question.explanation)}</p><p><b>根拠：</b>${escapeHtml(question.evidence)}</p></details>`}</article>`;}).join('');answerOffset+=passage.questions.length;return `<details><summary>${escapeHtml(passage.title||passage.topic)}：回答と本文</summary>${questions}<section class="passage-review"><div class="review-toggle" role="group" aria-label="本文表示"><button type="button" class="active" data-review-view="original" data-review-key="${key}">原文</button><button type="button" data-review-view="translation" data-review-key="${key}">和訳</button></div><div data-review-panel="original" data-review-key="${key}"><h3>Original</h3>${translationHtml(passage.passage)}</div><div data-review-panel="translation" data-review-key="${key}" hidden><h3>日本語訳</h3>${translationHtml(passage.translation)}</div></section></details>`;}).join('')}</div>`;
}

function mountReviewToggles() {
  for(const [key,id] of reviewTranslationIds){
    const panel=app.querySelector(`[data-review-key="${key}"][data-review-panel="translation"]`);
    if(panel)panel.dataset.bankTranslation=id;
  }
  app.querySelectorAll('[data-review-view]').forEach((button)=>button.onclick=async()=>{
    const key=button.dataset.reviewKey;
    app.querySelectorAll(`[data-review-key="${key}"][data-review-view]`).forEach((item)=>item.classList.toggle('active',item===button));
    app.querySelectorAll(`[data-review-key="${key}"][data-review-panel]`).forEach((panel)=>{panel.hidden=panel.dataset.reviewPanel!==button.dataset.reviewView;});
    const panel=app.querySelector(`[data-review-key="${key}"][data-bank-translation]`);
    if(button.dataset.reviewView!=='translation'||!panel||panel.dataset.loaded==='true'||panel.dataset.loading==='true')return;
    panel.dataset.loading='true';panel.innerHTML='<h3>日本語訳</h3><p role="status">全文和訳を読み込み中…</p>';
    try {
      const translation=await loadLongTranslation(panel.dataset.bankTranslation);
      if(!panel.isConnected)return;
      panel.innerHTML=`<h3>日本語訳</h3>${translationHtml(translation)}`;panel.dataset.loaded='true';
    }catch(error){if(panel.isConnected)panel.innerHTML=`<h3>日本語訳</h3><p role="alert">${escapeHtml(error.message)}</p>`;}
    finally{panel.dataset.loading='false';}
  });
}

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
  const confirm=app.querySelector('.reset-confirm'); app.querySelector('[data-reset]').onclick=()=>{confirm.hidden=false;}; app.querySelector('[data-cancel-reset]').onclick=()=>{confirm.hidden=true;}; app.querySelector('[data-confirm-reset]').onclick=()=>{resetState(); void clearSessions(); localStorage.removeItem('reading-rating-input-mode');store={...defaultState,longHistory:[],quickHistory:[]};renderRatingSetup();};
  if(!historyHydrated){ historyHydrated=true; void hydrateHistory(store).then((next)=>{ if(next.longHistory!==store.longHistory||next.quickHistory!==store.quickHistory){store={...store,longHistory:next.longHistory,quickHistory:next.quickHistory};saveState(store);if(app.querySelector('.profile-page'))renderProfile();} }); }
}

function renderHistory(filter='all') {
  const items=[]; if(filter!=='quick')store.longHistory.forEach((r,i)=>items.push({mode:'long',record:r,index:i})); if(filter!=='long')store.quickHistory.forEach((r,i)=>items.push({mode:'quick',record:r,index:i}));
  const rows=items.map(({mode,record,index})=>`<tr><td><button class="history-row" data-history-detail="${mode}" data-history-index="${index}"><span>${new Date(record.date).toLocaleDateString('ja-JP')}</span><span>${mode==='long'?`Long · Level ${record.passageDifficulty} · ${record.totalScore}/${longScoreMax(record)} · Rating ${record.displayRatingBefore} → ${record.displayRatingAfter} · ${record.WPM} WPM`:`Quick · ${record.correctAnswers}/9 · ${record.averageWPM} WPM`}</span></button></td><td><button type="button" class="text-button history-delete" data-history-delete="${mode}" data-history-index="${index}">削除</button></td></tr>`).join('')||'<tr><td colspan="2" class="empty-row">履歴はまだありません。</td></tr>';
  app.innerHTML=`<section class="history-page compact-history"><header><p class="eyebrow">${filter.toUpperCase()} HISTORY</p><h1>${filter==='long'?'Long':'Quick'} 履歴</h1><p>行をタップすると、その時点の本文・回答・未知語を確認できます。</p></header><div class="table-wrap"><table><thead><tr><th>Session</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><button class="text-button" data-profile>← プロフィール</button></section>`;
  app.querySelector('[data-profile]').onclick=renderProfile;
  app.querySelectorAll('[data-history-detail]').forEach((button)=>button.onclick=()=>renderHistoryDetail(button.dataset.historyDetail,Number(button.dataset.historyIndex)));
  app.querySelectorAll('[data-history-delete]').forEach((button)=>button.onclick=()=>{if(!window.confirm('この履歴を削除しますか？'))return; const list=button.dataset.historyDelete==='long'?store.longHistory:store.quickHistory; const [removed]=list.splice(Number(button.dataset.historyIndex),1); saveState(store); if(removed)void deleteSession(button.dataset.historyDelete,removed.id||historyRecordId(button.dataset.historyDelete,removed,Number(button.dataset.historyIndex))); renderHistory(filter);});
}

function renderHistoryDetail(mode,index) {
  const list=mode==='long'?store.longHistory:store.quickHistory; const record=list[index]; if(!record){renderHistory(mode);return;}
  const unknown=normalizeUnknownWords(record.unknownWords||[]); const unknownHtml=unknown.length?`<section class="vocab-card"><p class="eyebrow">UNKNOWN WORDS</p><h2>未知語</h2><ul>${unknown.map((v)=>`<li><b>${escapeHtml(v.word)}</b><span><em>基本義：</em>${escapeHtml(v.generalMeaning)}<strong class="vocab-example">${escapeHtml(v.exampleSentence||'')}</strong></span></li>`).join('')}</ul><button class="primary-button" data-copy-history>Vocabstar用にコピー</button></section>`:'<p class="empty-row">未知語の記録はありません。</p>';
  const title=mode==='long'?(record.title||record.passage?.title||'Long session'):'Quick session'; const review=mode==='long'?reviewHtml([record.passage||{questions:record.questions||[],passage:record.originalPassage||'',translation:record.japaneseTranslation||'',title}],record.answers||[]):reviewHtml(record.passages||[],record.answers||[]);
  app.innerHTML=`<section class="history-detail-page"><button class="text-button" data-history-back>← 履歴へ戻る</button><p class="eyebrow">${mode.toUpperCase()} SESSION</p><h1>${escapeHtml(title)}</h1><p>${new Date(record.date).toLocaleString('ja-JP')}</p><div class="result-grid"><div class="result-stat"><span>Score</span><strong>${mode==='long'?`${record.totalScore}/${longScoreMax(record)}`:`${record.correctAnswers}/9`}</strong></div><div class="result-stat"><span>Speed</span><strong>${mode==='long'?record.WPM:record.averageWPM} WPM</strong></div></div>${mode==='long'?`<section class="feedback-card"><h2>自分の要約</h2><p>${escapeHtml(record.summary||'')}</p><p><b>要約スコア：</b>${record.summaryDisplayScore??record.summaryScore??'—'}/10</p><p><b>模範要約：</b>${escapeHtml(record.modelAnswer||record.sampleSummary||'')}</p></section>`:''}<details class="review-card" open><summary>回答・解説・本文</summary>${review}</details>${unknownHtml}<button class="danger-button" data-history-remove>このセッションを削除</button></section>`;
  app.querySelector('[data-history-back]').onclick=()=>renderHistory(mode); app.querySelector('[data-history-remove]').onclick=()=>{if(window.confirm('この履歴を削除しますか？')){list.splice(index,1);saveState(store);void deleteSession(mode,record.id||historyRecordId(mode,record,index));renderHistory(mode);}}; mountReviewToggles();
  app.querySelector('[data-copy-history]')?.addEventListener('click',async(event)=>{const button=event.currentTarget;await navigator.clipboard.writeText(unknown.map((v)=>`${v.word}\t${v.generalMeaning}\t${v.exampleSentence||''}`).join('\n'));button.textContent='コピーしました ✓';});
  mountConciseVocabulary(record,mode,unknown);
}

document.querySelector('.profile-button').onclick=()=>{if(session?.timer)clearInterval(session.timer);session=null;document.body.classList.remove('question-active');renderProfile();}; document.querySelector('.brand').onclick=(event)=>{event.preventDefault();renderHome();}; renderHome();
