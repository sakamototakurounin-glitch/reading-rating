import { defaultState, loadState, resetState, saveState } from '../lib/storage.js';
import { displayRating, expectedAccuracy, passageRating, updateRatingWithCalibration } from '../lib/rating.js';
import { RATING } from '../lib/config.js';
import { selectDifficulty } from '../lib/difficulty.js';
import { calculateWpm, nextTimeLimit } from '../lib/quick.js';
import { QUESTION_LIMITS, longReadingLimitSeconds, validateLongContent, validateQuickSet } from '../lib/assessment.js';
import { quickSet, longPassage } from '../data/fallback.js';
import { answerInputHtml, mountAnswerInput } from './answer-input.js';

const app = document.querySelector('#app');
let store = loadState();
let session = null;
const fmtTime = (seconds) => { const value=Math.max(0,Math.ceil(seconds)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`; };
const escapeHtml = (value='') => value.replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const nowSeconds = () => performance.now() / 1000;

function renderHome() {
  document.title = 'Reading Rating — 英語読解トレーニング';
  if (store.internalRating === null || store.internalRating === undefined) { renderRatingSetup(); return; }
  app.innerHTML = `<section class="compact-home"><div class="home-heading"><p class="eyebrow">TRAINING</p><h1>Choose a mode</h1></div><div class="compact-mode-grid" aria-label="トレーニングモード"><article class="compact-mode quick-mode"><div><span class="mode-number">01</span><p class="mode-kicker">SPEED</p><h2>Quick <small>速読</small></h2><p>3 passages · 9 questions</p></div><button class="primary-button" data-start="quick">始める <span>→</span></button></article><article class="compact-mode long-mode"><div><span class="mode-number">02</span><p class="mode-kicker">DEPTH</p><h2>Long <small>長文</small></h2><p>5 questions · summary</p></div><button class="primary-button dark" data-start="long">始める <span>→</span></button></article></div></section>`;
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
  renderLoading('Quick setを準備中', '短く、鮮明な3つの英文を選んでいます。');
  const passages = await requestContent('/api/generate-quick', {}, quickSet, validateQuickSet);
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
  renderTimedQuestion({mode:'quick',question,index:session.questionIndex,total:3,duration:QUESTION_LIMITS.quick,translation:item.translation,label:`QUICK ${session.passageIndex+1}/3`,onRecorded:(answer)=>session.answers.push(answer),onNext:()=>{session.questionIndex+=1;if(session.questionIndex<3)renderQuickQuestions();else{session.passageIndex+=1;session.phase='reading';session.passageIndex<3?renderQuickReading():renderQuickResult();}}});
}

function renderTimedQuestion({mode,question,index,total,duration,translation,label,onRecorded,onNext}) {
  const inputName=`${mode}-answer`; let settled=false; const startedAt=nowSeconds();
  app.innerHTML=`<section class="focus-question"><div class="step-line"><span>${label}</span><span>${index+1}/${total}</span></div><div class="question-timer" aria-live="polite"><span>回答時間</span><strong id="question-timer">${fmtTime(duration)}</strong></div><form><fieldset class="question-card single-question"><legend>${escapeHtml(question.prompt)}</legend><div class="choice-list">${choiceHtml(question,inputName)}</div></fieldset><p class="form-notice" hidden>回答を選んでください。</p><section class="answer-feedback" hidden><p data-answer-status></p><div class="feedback-tools"><button type="button" data-toggle="explanation">解説を見る</button><button type="button" data-toggle="translation">全文和訳を見る</button></div><div class="learning-panel" data-panel="explanation" hidden><h2>解説</h2><p><b>正解：</b>${String.fromCharCode(65+question.answer)}. ${escapeHtml(question.choices[question.answer])}</p><p>${escapeHtml(question.explanation)}</p><p><b>本文の根拠：</b>${escapeHtml(question.evidence)}</p></div><div class="learning-panel translation-panel" data-panel="translation" hidden><h2>本文の日本語訳</h2>${translationHtml(translation)}</div></section><div class="sticky-action"><button class="primary-button dark" type="submit" data-submit-answer>回答する <span>→</span></button><button class="primary-button dark" type="button" data-next hidden>次へ <span>→</span></button></div></form></section>`;
  const form=app.querySelector('form'); const timerElement=app.querySelector('#question-timer');
  const timer=setInterval(()=>{const left=Math.max(0,duration-(nowSeconds()-startedAt));timerElement.textContent=fmtTime(left);timerElement.parentElement.classList.toggle('warning',left<=10);if(left<=0)settle(null,true);},250);
  function settle(selected,timedOut=false) {
    if(settled)return; settled=true; clearInterval(timer); timerElement.textContent='0:00';
    onRecorded({selected,answer:question.answer,timedOut});
    form.querySelectorAll('input').forEach((input)=>{input.disabled=true;const labelElement=input.closest('label');if(Number(input.value)===question.answer)labelElement.classList.add('is-correct');if(selected!==null&&Number(input.value)===selected&&selected!==question.answer)labelElement.classList.add('is-wrong');});
    const correct=selected===question.answer; const status=app.querySelector('[data-answer-status]');
    status.textContent=timedOut?`時間切れ（正解：${String.fromCharCode(65+question.answer)}）`:correct?'正解です':`不正解（正解：${String.fromCharCode(65+question.answer)}）`;
    status.className=correct?'correct':'incorrect'; app.querySelector('.answer-feedback').hidden=false; app.querySelector('[data-submit-answer]').hidden=true; app.querySelector('[data-next]').hidden=false;
  }
  form.onsubmit=(event)=>{event.preventDefault();const selected=form.elements[inputName].value;if(selected===''){app.querySelector('.form-notice').hidden=false;return;}settle(Number(selected));};
  app.querySelector('[data-next]').onclick=onNext;
  app.querySelectorAll('[data-toggle]').forEach((button)=>button.onclick=()=>{const panel=app.querySelector(`[data-panel="${button.dataset.toggle}"]`);panel.hidden=!panel.hidden;button.textContent=panel.hidden?(button.dataset.toggle==='explanation'?'解説を見る':'全文和訳を見る'):(button.dataset.toggle==='explanation'?'解説を閉じる':'全文和訳を閉じる');});
}

function translationHtml(translation='') { return String(translation).split(/\n\s*\n/).map((paragraph)=>`<p>${escapeHtml(paragraph)}</p>`).join(''); }

function renderQuickResult() {
  const correct = session.answers.filter((a) => a.selected === a.answer).length;
  const averageWPM = Math.round(session.passages.reduce((sum,p,i) => sum + calculateWpm(p.passage.trim().split(/\s+/).length, session.readingTimes[i]), 0) / 3);
  const nextLimit = nextTimeLimit(session.limit, correct);
  const record = { date:new Date().toISOString(), passages:session.passages, correctAnswers:correct, totalQuestions:9, accuracy:correct/9, readingTimes:session.readingTimes, averageWPM, currentTimeLimit:session.limit, nextTimeLimit:nextLimit };
  store.quickHistory.unshift(record); store.quickTimeLimit=nextLimit; saveState(store);
  renderResult('QUICK COMPLETE', `${correct}<small>/9</small>`, '正確さを保ちながら、テンポを育てる。', [['Accuracy',`${Math.round(correct/9*100)}%`],['Average WPM',averageWPM],['Time limit',`${session.limit}s → ${nextLimit}s`]],reviewHtml(session.passages));
}

async function startLong() {
  const difficulty = selectDifficulty(store.internalRating); renderLoading('Long passageを準備中', '現在のReading Ratingに合う文章を構成しています。');
  const content = await requestContent('/api/generate-long', { difficulty }, longPassage, validateLongContent);
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
function toggleUnknown(button) { const word=button.dataset.word; if(session.unknownWords.has(word)) session.unknownWords.delete(word); else {const known=session.content.vocabulary?.[word];session.unknownWords.set(word,typeof known==='string'?{contextMeaning:known,basicMeaning:known,partOfSpeech:'—'}:known||{contextMeaning:'取得中',basicMeaning:'取得中',partOfSpeech:'—',pending:true});} document.querySelectorAll(`[data-word="${CSS.escape(word)}"]`).forEach((el)=>el.classList.toggle('unknown',session.unknownWords.has(word))); }
function finishLongReading(timedOut=false) { if(session.phase!=='reading')return; clearInterval(session.timer); session.readingTime=Math.min(session.readingLimit,Math.max(1,nowSeconds()-session.startedAt)); session.readingTimedOut=timedOut; session.phase='questions'; session.questionIndex=0; session.longAnswers=[]; renderLongQuestions(); }

function renderLongQuestions() {
  if(session.questionIndex>=session.content.questions.length){renderLongSummary();return;}
  const question=session.content.questions[session.questionIndex];
  renderTimedQuestion({mode:'long',question,index:session.questionIndex,total:5,duration:QUESTION_LIMITS.long,translation:session.content.translation,label:'LONG · 選択問題',onRecorded:(answer)=>session.longAnswers.push(answer),onNext:()=>{session.questionIndex+=1;renderLongQuestions();}});
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
  const record={date:new Date().toISOString(),internalRatingBefore:oldRating,internalRatingAfter:ratingUpdate.newRating,displayRatingBefore:displayRating(oldRating),displayRatingAfter:displayRating(ratingUpdate.newRating),ratingMultiplier:ratingUpdate.multiplier,passageDifficulty:session.difficulty,passageRating:passageRating(session.difficulty),expectedAccuracy:expected,actualAccuracy:actual,totalScore,multipleChoiceScore,summaryScore,readingTime:session.readingTime,WPM:wpm,unknownWords,passage:session.content,questions:session.content.questions,summary,goodPoints:grade.goodPoints,missingPoints:grade.missingPoints,improvements:grade.improvements,modelAnswer:grade.modelAnswer||session.content.sampleSummary};
  store.internalRating=ratingUpdate.newRating; store.longHistory.unshift(record); saveState(store); renderLongResult(record);
}

async function resolveUnknownWords() {
  const pending=[...session.unknownWords].filter(([,details])=>details?.pending).map(([word])=>word);
  if(pending.length){
    const fallback=pending.map((word)=>({word,contextMeaning:`本文中の「${word}」`,basicMeaning:`${word}（辞書情報を再取得してください）`,partOfSpeech:'—'}));
    const entries=await requestContent('/api/lookup-words',{passage:session.content.passage,words:pending},fallback,(value)=>Array.isArray(value)?value:fallback);
    entries.forEach(({word,...details})=>{if(session.unknownWords.has(word.toLowerCase()))session.unknownWords.set(word.toLowerCase(),details);});
  }
  return [...session.unknownWords].map(([word,details])=>({word,...details}));
}

function gradeSummaryLocally(summary) { const lengthScore=summary.length>=120?4:summary.length>=70?3:summary.length>=40?2:1; const concepts=['公共','空間','設計','多様','安全','評価','予期','意味']; return Math.min(10,lengthScore+Math.min(6,concepts.filter((word)=>summary.includes(word)).length)); }

function renderLongResult(record) {
  const vocabRows=record.unknownWords.length?record.unknownWords.map(({word,contextMeaning,basicMeaning,partOfSpeech})=>`<li><b>${escapeHtml(word)}</b><span><em>本文中：</em>${escapeHtml(contextMeaning)}<small>基本義：${escapeHtml(basicMeaning)} · ${escapeHtml(partOfSpeech)}</small></span></li>`).join(''):'<li class="empty-row">今回は記録した単語はありません。</li>';
  app.innerHTML=`<section class="result-page"><div class="result-hero"><p class="eyebrow">LONG COMPLETE</p><div class="rating-shift"><span>${record.displayRatingBefore}</span><i>→</i><strong>${record.displayRatingAfter}</strong></div><h1>Reading Rating</h1><p>${record.internalRatingAfter>=100?'表示は100。内部Ratingは引き続き精密に更新されています。':'今回の理解度を反映しました。'}</p></div><div class="result-grid"><div class="result-stat featured"><span>Total score</span><strong>${record.totalScore}<small>/25</small></strong></div><div class="result-stat"><span>選択問題</span><strong>${record.multipleChoiceScore}<small>/15</small></strong></div><div class="result-stat"><span>日本語要約</span><strong>${record.summaryScore}<small>/10</small></strong></div><div class="result-stat"><span>Reading time</span><strong>${fmtTime(record.readingTime)}</strong></div><div class="result-stat"><span>WPM</span><strong>${record.WPM}</strong></div></div><section class="feedback-card summary-feedback"><p class="eyebrow">SUMMARY FEEDBACK</p><div><h2>自分の回答</h2><p>${escapeHtml(record.summary)}</p></div><div class="summary-score"><strong>${record.summaryScore}<small>/10</small></strong><p><b>良かった点：</b>${escapeHtml(record.goodPoints)}</p><p><b>不足したポイント：</b>${escapeHtml(record.missingPoints)}</p><p><b>改善ポイント：</b>${escapeHtml(record.improvements)}</p></div><details><summary>模範解答を見る</summary><p>${escapeHtml(record.modelAnswer)}</p></details></section><details class="review-card"><summary>選択問題の解説を見る</summary>${reviewHtml([record.passage])}</details><details class="review-card"><summary>全文和訳を見る</summary><div class="learning-panel">${translationHtml(record.passage.translation)}</div></details><section class="vocab-card"><div><p class="eyebrow">UNKNOWN WORDS</p><h2>今回の未知語</h2></div><ul>${vocabRows}</ul><button class="primary-button" data-copy ${record.unknownWords.length?'':'disabled'}>Vocabstar用にコピー <span>⧉</span></button></section><div class="result-actions"><button class="primary-button dark" data-home>ホームへ <span>→</span></button></div></section>`;
  app.querySelector('[data-home]').onclick=renderHome; const copy=app.querySelector('[data-copy]'); if(!copy.disabled) copy.onclick=async()=>{await navigator.clipboard.writeText(record.unknownWords.map(v=>`${v.word}\t${v.contextMeaning}\t${v.basicMeaning}\t${v.partOfSpeech}`).join('\n'));copy.textContent='コピーしました ✓';};
}

function reviewHtml(passages) { return `<div class="review-content">${passages.map((passage)=>`<details><summary>${escapeHtml(passage.title||passage.topic)}：解説と和訳</summary>${passage.questions.map((question,index)=>`<article><h3>${index+1}. ${escapeHtml(question.prompt)}</h3><p><b>正解：</b>${String.fromCharCode(65+question.answer)}. ${escapeHtml(question.choices[question.answer])}</p><p>${escapeHtml(question.explanation)}</p><p><b>根拠：</b>${escapeHtml(question.evidence)}</p></article>`).join('')}<div class="translation-panel"><h3>本文の日本語訳</h3>${translationHtml(passage.translation)}</div></details>`).join('')}</div>`; }

function questionsHtml(questions,prefix) { return questions.map((q,i)=>`<fieldset class="question-card"><legend><span>${String(i+1).padStart(2,'0')}</span>${escapeHtml(q.prompt)}</legend><div class="choice-list">${q.choices.map((choice,j)=>`<label><input type="radio" name="${prefix}-${i}" value="${j}"><span class="choice-marker">${String.fromCharCode(65+j)}</span><span>${escapeHtml(choice)}</span></label>`).join('')}</div></fieldset>`).join(''); }
function choiceHtml(question,name) { return question.choices.map((choice,index)=>`<label><input type="radio" name="${name}" value="${index}"><span class="choice-marker">${String.fromCharCode(65+index)}</span><span>${escapeHtml(choice)}</span></label>`).join(''); }
function validateAnswered(form,count) { const answered=new Set([...new FormData(form).keys()].filter((key)=>key!=='summary')).size; if(answered<count){form.querySelector('.form-notice')?.remove();form.insertAdjacentHTML('afterbegin','<p class="form-notice">すべての問題に回答してください。</p>');return false;}return true; }
function renderResult(kicker,score,subcopy,stats,extra='') { app.innerHTML=`<section class="result-page compact-result"><div class="result-hero quick-result"><p class="eyebrow">${kicker}</p><div class="result-score">${score}</div><p>${subcopy}</p></div><div class="result-grid">${stats.map(([label,value],i)=>`<div class="result-stat ${i===0?'featured':''}"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>${extra?`<details class="review-card"><summary>解説・全文和訳を見る</summary>${extra}</details>`:''}<div class="result-actions"><button class="primary-button" data-again>もう一度 <span>↻</span></button><button class="primary-button dark" data-home>ホーム <span>→</span></button></div></section>`;app.querySelector('[data-again]').onclick=startQuick;app.querySelector('[data-home]').onclick=renderHome; }
function renderLoading(title,detail) { app.innerHTML=`<section class="loading-view"><div class="loader-ring"></div><p class="eyebrow">PLEASE WAIT</p><h1 class="section-title">${title}</h1><p>${detail}</p></section>`; }

function renderProfile() {
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
