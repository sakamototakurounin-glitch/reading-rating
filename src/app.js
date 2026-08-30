import { loadState, saveState } from '../lib/storage.js';
import { displayRating, expectedAccuracy, passageRating, updateRating } from '../lib/rating.js';
import { selectDifficulty } from '../lib/difficulty.js';
import { calculateWpm, nextTimeLimit } from '../lib/quick.js';
import { quickSet, longPassage } from '../data/fallback.js';

const app = document.querySelector('#app');
let store = loadState();
let session = null;
const fmtTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
const escapeHtml = (value='') => value.replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const nowSeconds = () => performance.now() / 1000;

function renderHome() {
  document.title = 'Reading Rating — 英語読解トレーニング';
  app.innerHTML = `<section class="hero"><div class="hero-copy"><p class="eyebrow">READ WITH INTENT</p><h1>読む速さも、<br><em>読み解く深さ</em>も。</h1><p class="lede">短い英文でテンポを磨く Quick。長文を記憶し、考え抜く Long。今日の読解力を、次の一歩へ。</p></div><div class="rating-orbit" aria-label="現在のReading Rating ${displayRating(store.internalRating)}"><div class="orbit-label">READING RATING</div><div class="rating-number">${displayRating(store.internalRating)}</div><div class="rating-note">your current measure</div></div></section><section class="mode-grid" aria-label="トレーニングモード"><article class="mode-card quick-card"><div class="mode-index">01</div><p class="mode-kicker">PACE & PRECISION</p><h2>Quick <span>速読</span></h2><p>約200語の英文を3本。正確さを保ちながら、読むテンポを一段ずつ上げていきます。</p><div class="mode-meta"><span>3 passages</span><span>9 questions</span><span>${store.quickTimeLimit} sec each</span></div><button class="primary-button" data-start="quick">Quick を始める <span>→</span></button></article><article class="mode-card long-card"><div class="mode-index">02</div><p class="mode-kicker">DEPTH & RETENTION</p><h2>Long <span>長文読解</span></h2><p>800〜1200語を読み、本文を閉じてから回答。理解・記憶・構造把握を測ります。</p><div class="mode-meta"><span>5 questions</span><span>+ summary</span></div><button class="primary-button dark" data-start="long">Long を始める <span>→</span></button></article></section><section class="principle-strip"><p>速さだけでも、正確さだけでもない。</p><div class="principle-line"><span>PACE</span><i></i><span>COMPREHENSION</span><i></i><span>GROWTH</span></div></section>`;
  app.querySelector('[data-start="quick"]').onclick = startQuick;
  app.querySelector('[data-start="long"]').onclick = startLong;
}

async function requestContent(endpoint, payload, fallback) {
  try { const response = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); if (!response.ok) throw new Error(); return await response.json(); }
  catch { return fallback; }
}

async function startQuick() {
  renderLoading('Quick setを準備中', '短く、鮮明な3つの英文を選んでいます。');
  const passages = await requestContent('/api/generate-quick', {}, quickSet);
  session = { mode:'quick', passages, passageIndex:0, answers:[], readingTimes:[], phase:'reading', startedAt:nowSeconds(), limit:store.quickTimeLimit };
  renderQuickReading();
}

function renderQuickReading() {
  const item = session.passages[session.passageIndex]; session.startedAt = nowSeconds();
  app.innerHTML = `<section class="session-head"><button class="text-button" data-home>← 終了</button><div class="progress-label">QUICK ${session.passageIndex + 1} / 3</div><div class="timer-pill"><span>TIME GUIDE</span><b id="timer">${fmtTime(session.limit)}</b></div></section><article class="reading-layout"><aside><p class="eyebrow">${escapeHtml(item.topic)}</p><h1 class="article-title">Read for<br><em>meaning.</em></h1><p>細部に止まりすぎず、文章全体の流れをつかみましょう。</p></aside><div class="passage-panel"><p class="passage-text">${escapeHtml(item.passage)}</p><button class="primary-button dark" data-finish>読み終えて問題へ <span>→</span></button></div></article>`;
  const timer = app.querySelector('#timer');
  const tick = setInterval(() => { const left = Math.max(0, session.limit - (nowSeconds() - session.startedAt)); timer.textContent = fmtTime(left); if (left <= 0) finishQuickReading(); }, 250);
  session.timer = tick; app.querySelector('[data-finish]').onclick = finishQuickReading; app.querySelector('[data-home]').onclick = () => { clearInterval(tick); renderHome(); };
}

function finishQuickReading() {
  clearInterval(session.timer); if (session.phase !== 'reading') return; session.phase = 'questions';
  session.readingTimes.push(Math.min(session.limit, Math.max(1, nowSeconds() - session.startedAt))); renderQuickQuestions();
}

function renderQuickQuestions() {
  const item = session.passages[session.passageIndex];
  app.innerHTML = `<section class="question-page"><header><p class="eyebrow">QUICK CHECK · ${session.passageIndex + 1}/3</p><h1 class="section-title">記憶をたどって答える。</h1><p>本文には戻れません。もっとも適切な答えを選んでください。</p></header><form class="question-list">${questionsHtml(item.questions, `q${session.passageIndex}`)}<button class="primary-button dark" type="submit">回答を確定 <span>→</span></button></form></section>`;
  app.querySelector('form').onsubmit = (event) => { event.preventDefault(); if (!validateAnswered(event.currentTarget, item.questions.length)) return; item.questions.forEach((q,index) => session.answers.push({ selected:Number(new FormData(event.currentTarget).get(`q${session.passageIndex}-${index}`)), answer:q.answer })); session.passageIndex += 1; session.phase='reading'; session.passageIndex < 3 ? renderQuickReading() : renderQuickResult(); };
}

function renderQuickResult() {
  const correct = session.answers.filter((a) => a.selected === a.answer).length;
  const averageWPM = Math.round(session.passages.reduce((sum,p,i) => sum + calculateWpm(p.passage.trim().split(/\s+/).length, session.readingTimes[i]), 0) / 3);
  const nextLimit = nextTimeLimit(session.limit, correct);
  const record = { date:new Date().toISOString(), passages:session.passages, correctAnswers:correct, totalQuestions:9, accuracy:correct/9, readingTimes:session.readingTimes, averageWPM, currentTimeLimit:session.limit, nextTimeLimit:nextLimit };
  store.quickHistory.unshift(record); store.quickTimeLimit=nextLimit; saveState(store);
  renderResult('QUICK COMPLETE', `${correct}<small>/9</small>`, '正確さを保ちながら、テンポを育てる。', [['Accuracy',`${Math.round(correct/9*100)}%`],['Average WPM',averageWPM],['Time limit',`${session.limit}s → ${nextLimit}s`]]);
}

async function startLong() {
  const difficulty = selectDifficulty(store.internalRating); renderLoading('Long passageを準備中', '現在のReading Ratingに合う文章を構成しています。');
  const content = await requestContent('/api/generate-long', { difficulty }, longPassage);
  session = { mode:'long', content, difficulty, unknownWords:new Map(), phase:'reading', startedAt:nowSeconds() }; renderLongReading();
}

function renderLongReading() {
  const { content } = session;
  const paragraphs = content.passage.split(/\n\s*\n/).map((p,i) => `<p data-paragraph="${i}">${tokenizeParagraph(p)}</p>`).join('');
  app.innerHTML = `<section class="session-head"><button class="text-button" data-home>← 終了</button><div class="progress-label">LONG READING</div><div class="timer-pill"><span>READING TIME</span><b id="timer">0:00</b></div></section><article class="long-reading"><header class="article-header"><p class="eyebrow">${escapeHtml(content.topic)}</p><h1 class="section-title">${escapeHtml(content.title)}</h1><p class="tap-guide"><span></span> 知らない単語はタップして記録。意味は読了後に確認できます。</p></header><div class="long-copy">${paragraphs}</div><footer class="reading-footer"><p>本文は「読了」後に見返せません。</p><button class="primary-button dark" data-finish>読了・問題へ進む <span>→</span></button></footer></article>`;
  const updateTimer=()=>app.querySelector('#timer').textContent=fmtTime(nowSeconds()-session.startedAt); updateTimer(); session.timer=setInterval(updateTimer,1000);
  app.querySelectorAll('.word-token').forEach((button)=>button.onclick=()=>toggleUnknown(button)); app.querySelector('[data-finish]').onclick=finishLongReading; app.querySelector('[data-home]').onclick=()=>{clearInterval(session.timer);renderHome();};
}

function tokenizeParagraph(text) { return text.split(/(\s+)/).map((token)=>{ if (/^\s+$/.test(token)) return token; const word=token.toLowerCase().replace(/^[^a-z]+|[^a-z'-]+$/g,''); return word ? `<button type="button" class="word-token" data-word="${escapeHtml(word)}">${escapeHtml(token)}</button>` : escapeHtml(token); }).join(''); }
function toggleUnknown(button) { const word=button.dataset.word; if(session.unknownWords.has(word)) session.unknownWords.delete(word); else session.unknownWords.set(word,session.content.vocabulary?.[word]||'（文脈に応じて確認）'); document.querySelectorAll(`[data-word="${CSS.escape(word)}"]`).forEach((el)=>el.classList.toggle('unknown',session.unknownWords.has(word))); }
function finishLongReading() { clearInterval(session.timer); session.readingTime=Math.max(1,nowSeconds()-session.startedAt); session.phase='questions'; renderLongQuestions(); }

function renderLongQuestions() {
  const { questions }=session.content;
  app.innerHTML=`<section class="question-page long-questions"><header><p class="eyebrow">COMPREHENSION & RETENTION</p><h1 class="section-title">文章を思い出し、<br>考えをまとめる。</h1><p>選択問題は各3点、日本語要約は10点です。</p></header><form class="question-list">${questionsHtml(questions,'long')}<div class="summary-card"><label for="summary">日本語要約 <span>10 points</span></label><p>文章の中心的な主張と、それを支える重要な論点を200〜300字程度でまとめてください。</p><textarea id="summary" name="summary" minlength="40" required placeholder="ここに日本語で要約を入力…"></textarea><div class="char-count"><span id="char-count">0</span> characters</div></div><button class="primary-button dark" type="submit">採点する <span>→</span></button></form></section>`;
  const textarea=app.querySelector('textarea'); textarea.oninput=()=>app.querySelector('#char-count').textContent=textarea.value.length; app.querySelector('form').onsubmit=submitLong;
}

async function submitLong(event) {
  event.preventDefault(); const form=event.currentTarget; if(!validateAnswered(form,5)) return;
  const answers=session.content.questions.map((q,i)=>({selected:Number(new FormData(form).get(`long-${i}`)),answer:q.answer})); const mcCorrect=answers.filter((a)=>a.selected===a.answer).length; const summary=new FormData(form).get('summary').trim();
  renderLoading('採点中','理解の正確さと要約の質を確認しています。');
  const grade=await requestContent('/api/grade-summary',{passage:session.content.passage,summary},{score:gradeSummaryLocally(summary),feedback:'中心的な主張と主要な論点を、本文に沿って簡潔にまとめています。'});
  const summaryScore=Math.max(0,Math.min(10,Math.round(Number(grade.score)||0))); const multipleChoiceScore=mcCorrect*3; const totalScore=multipleChoiceScore+summaryScore; const actual=totalScore/25; const expected=expectedAccuracy(store.internalRating,session.difficulty); const oldRating=store.internalRating; const ratingUpdate=updateRating(oldRating,actual,expected); const wordCount=session.content.passage.trim().split(/\s+/).length; const wpm=calculateWpm(wordCount,session.readingTime); const unknownWords=[...session.unknownWords].map(([word,translation])=>({word,translation}));
  const record={date:new Date().toISOString(),internalRatingBefore:oldRating,internalRatingAfter:ratingUpdate.newRating,displayRatingBefore:displayRating(oldRating),displayRatingAfter:displayRating(ratingUpdate.newRating),passageDifficulty:session.difficulty,passageRating:passageRating(session.difficulty),expectedAccuracy:expected,actualAccuracy:actual,totalScore,multipleChoiceScore,summaryScore,readingTime:session.readingTime,WPM:wpm,unknownWords,passage:session.content,questions:session.content.questions,summary,feedback:grade.feedback};
  store.internalRating=ratingUpdate.newRating; store.longHistory.unshift(record); saveState(store); renderLongResult(record);
}

function gradeSummaryLocally(summary) { const lengthScore=summary.length>=120?4:summary.length>=70?3:summary.length>=40?2:1; const concepts=['公共','空間','設計','多様','安全','評価','予期','意味']; return Math.min(10,lengthScore+Math.min(6,concepts.filter((word)=>summary.includes(word)).length)); }

function renderLongResult(record) {
  const vocabRows=record.unknownWords.length?record.unknownWords.map(({word,translation})=>`<li><b>${escapeHtml(word)}</b><span>${escapeHtml(translation)}</span></li>`).join(''):'<li class="empty-row">今回は記録した単語はありません。</li>';
  app.innerHTML=`<section class="result-page"><div class="result-hero"><p class="eyebrow">LONG COMPLETE</p><div class="rating-shift"><span>${record.displayRatingBefore}</span><i>→</i><strong>${record.displayRatingAfter}</strong></div><h1>Reading Rating</h1><p>${record.internalRatingAfter>=100?'表示は100。内部Ratingは引き続き精密に更新されています。':'今回の理解度を反映しました。'}</p></div><div class="result-grid"><div class="result-stat featured"><span>Total score</span><strong>${record.totalScore}<small>/25</small></strong></div><div class="result-stat"><span>選択問題</span><strong>${record.multipleChoiceScore}<small>/15</small></strong></div><div class="result-stat"><span>日本語要約</span><strong>${record.summaryScore}<small>/10</small></strong></div><div class="result-stat"><span>Reading time</span><strong>${fmtTime(record.readingTime)}</strong></div><div class="result-stat"><span>WPM</span><strong>${record.WPM}</strong></div></div><section class="feedback-card"><p class="eyebrow">SUMMARY FEEDBACK</p><p>${escapeHtml(record.feedback)}</p></section><section class="vocab-card"><div><p class="eyebrow">UNKNOWN WORDS</p><h2>今回の未知語</h2></div><ul>${vocabRows}</ul><button class="primary-button" data-copy ${record.unknownWords.length?'':'disabled'}>Vocabstar用にコピー <span>⧉</span></button></section><div class="result-actions"><button class="primary-button dark" data-home>ホームへ <span>→</span></button></div></section>`;
  app.querySelector('[data-home]').onclick=renderHome; const copy=app.querySelector('[data-copy]'); if(!copy.disabled) copy.onclick=async()=>{await navigator.clipboard.writeText(record.unknownWords.map(v=>`${v.word}\t${v.translation}`).join('\n'));copy.textContent='コピーしました ✓';};
}

function questionsHtml(questions,prefix) { return questions.map((q,i)=>`<fieldset class="question-card"><legend><span>${String(i+1).padStart(2,'0')}</span>${escapeHtml(q.prompt)}</legend><div class="choice-list">${q.choices.map((choice,j)=>`<label><input type="radio" name="${prefix}-${i}" value="${j}"><span class="choice-marker">${String.fromCharCode(65+j)}</span><span>${escapeHtml(choice)}</span></label>`).join('')}</div></fieldset>`).join(''); }
function validateAnswered(form,count) { const answered=new Set([...new FormData(form).keys()].filter((key)=>key!=='summary')).size; if(answered<count){form.querySelector('.form-notice')?.remove();form.insertAdjacentHTML('afterbegin','<p class="form-notice">すべての問題に回答してください。</p>');return false;}return true; }
function renderResult(kicker,score,subcopy,stats) { app.innerHTML=`<section class="result-page"><div class="result-hero quick-result"><p class="eyebrow">${kicker}</p><div class="result-score">${score}</div><h1>Good rhythm.</h1><p>${subcopy}</p></div><div class="result-grid">${stats.map(([label,value],i)=>`<div class="result-stat ${i===0?'featured':''}"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div><div class="result-actions"><button class="primary-button" data-again>もう一度 Quick <span>↻</span></button><button class="primary-button dark" data-home>ホームへ <span>→</span></button></div></section>`;app.querySelector('[data-again]').onclick=startQuick;app.querySelector('[data-home]').onclick=renderHome; }
function renderLoading(title,detail) { app.innerHTML=`<section class="loading-view"><div class="loader-ring"></div><p class="eyebrow">PLEASE WAIT</p><h1 class="section-title">${title}</h1><p>${detail}</p></section>`; }

function renderHistory() {
  const longRows=store.longHistory.map((r)=>`<tr><td>${new Date(r.date).toLocaleDateString('ja-JP')}</td><td>Long</td><td>${r.displayRatingBefore} → ${r.displayRatingAfter}</td><td>${r.totalScore}/25</td><td>${r.WPM} WPM</td></tr>`); const quickRows=store.quickHistory.map((r)=>`<tr><td>${new Date(r.date).toLocaleDateString('ja-JP')}</td><td>Quick</td><td>—</td><td>${r.correctAnswers}/9</td><td>${r.averageWPM} WPM</td></tr>`); const rows=[...longRows,...quickRows].join('')||'<tr><td colspan="5" class="empty-row">まだ履歴はありません。最初のトレーニングを始めましょう。</td></tr>';
  app.innerHTML=`<section class="history-page"><header><p class="eyebrow">YOUR PROGRESS</p><h1 class="section-title">Reading history</h1><p>速さと深さ、それぞれの積み重ね。</p></header><div class="table-wrap"><table><thead><tr><th>Date</th><th>Mode</th><th>Rating</th><th>Score</th><th>Speed</th></tr></thead><tbody>${rows}</tbody></table></div><button class="primary-button dark" data-home>ホームへ <span>→</span></button></section>`;app.querySelector('[data-home]').onclick=renderHome;
}

document.querySelector('.history-link').onclick=renderHistory; document.querySelector('.brand').onclick=(event)=>{event.preventDefault();renderHome();}; renderHome();
