const PREFERENCE_KEY = 'reading-rating-input-mode';

export function answerInputHtml() {
  const preferred = localStorage.getItem(PREFERENCE_KEY) || 'keyboard';
  return `<section class="answer-input" data-answer-input data-mode="${preferred}">
    <div class="input-switch" role="tablist" aria-label="入力方式">
      <button type="button" role="tab" data-input-mode="keyboard" aria-selected="${preferred === 'keyboard'}">キーボード</button>
      <button type="button" role="tab" data-input-mode="handwriting" aria-selected="${preferred === 'handwriting'}">手書き</button>
    </div>
    <div class="input-stage">
      <div class="keyboard-panel" data-input-panel="keyboard">
        <textarea class="answer-textarea" data-keyboard-text lang="ja" inputmode="text" placeholder="日本語で要約を入力…"></textarea>
      </div>
      <div class="handwriting-panel" data-input-panel="handwriting">
        <canvas class="handwriting-canvas" data-handwriting-canvas aria-label="手書き入力キャンバス"></canvas>
        <div class="canvas-actions">
          <button type="button" data-undo>元に戻す</button><button type="button" data-clear>消去</button>
          <button type="button" class="recognize-button" data-recognize>文字認識</button>
        </div>
        <label class="recognized-label">認識結果（編集できます）<textarea class="recognized-text" data-recognized-text lang="ja" placeholder="認識後の文字がここに表示されます"></textarea></label>
      </div>
    </div>
    <div class="input-status" data-input-status aria-live="polite"></div>
  </section>`;
}

export function mountAnswerInput(root) {
  const widget = root.querySelector('[data-answer-input]');
  const keyboard = widget.querySelector('[data-keyboard-text]');
  const recognized = widget.querySelector('[data-recognized-text]');
  const canvas = widget.querySelector('[data-handwriting-canvas]');
  const context = canvas.getContext('2d');
  const strokes = [];
  let activeStroke = null;
  let value = '';

  const syncText = (source) => { value = source.value; if (source !== keyboard) keyboard.value = value; if (source !== recognized) recognized.value = value; autoSize(keyboard); };
  keyboard.addEventListener('input', () => syncText(keyboard));
  recognized.addEventListener('input', () => syncText(recognized));

  const setMode = (mode) => {
    widget.dataset.mode = mode;
    localStorage.setItem(PREFERENCE_KEY, mode);
    widget.querySelectorAll('[data-input-mode]').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.inputMode === mode)));
    if (mode === 'keyboard') keyboard.focus(); else resizeCanvas();
  };
  widget.querySelectorAll('[data-input-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.inputMode)));

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (!rect.width || (canvas.width === Math.round(rect.width * ratio) && canvas.height === Math.round(rect.height * ratio))) return;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0); redraw();
  }
  function point(event) { const rect = canvas.getBoundingClientRect(); return { x:event.clientX-rect.left, y:event.clientY-rect.top }; }
  function drawStroke(stroke) { if (stroke.length < 2) return; context.strokeStyle='#14231d'; context.lineWidth=3; context.lineCap='round'; context.lineJoin='round'; context.beginPath(); context.moveTo(stroke[0].x,stroke[0].y); stroke.slice(1).forEach((p)=>context.lineTo(p.x,p.y)); context.stroke(); }
  function redraw() { context.clearRect(0,0,canvas.clientWidth,canvas.clientHeight); strokes.forEach(drawStroke); }
  canvas.addEventListener('pointerdown',(event)=>{ event.preventDefault(); canvas.setPointerCapture(event.pointerId); activeStroke=[point(event)]; strokes.push(activeStroke); });
  canvas.addEventListener('pointermove',(event)=>{ if(!activeStroke)return; event.preventDefault(); activeStroke.push(point(event)); redraw(); });
  const finishStroke=()=>{activeStroke=null;}; canvas.addEventListener('pointerup',finishStroke); canvas.addEventListener('pointercancel',finishStroke);
  widget.querySelector('[data-undo]').onclick=()=>{strokes.pop();redraw();};
  widget.querySelector('[data-clear]').onclick=()=>{strokes.length=0;redraw();};
  widget.querySelector('[data-recognize]').onclick=async()=>{
    const status=widget.querySelector('[data-input-status]');
    if(!strokes.length){status.textContent='文字を書いてから認識してください。';return;}
    status.textContent='認識しています…';
    try { const response=await fetch('/api/recognize-handwriting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:canvas.toDataURL('image/png')})}); if(!response.ok)throw new Error(); const data=await response.json(); recognized.value=data.text||''; syncText(recognized); status.textContent='認識しました。必要なら下の文章を修正してください。'; }
    catch { status.textContent='認識できませんでした。キーボード入力または再試行をお使いください。'; }
  };
  new ResizeObserver(resizeCanvas).observe(canvas); setMode(widget.dataset.mode);
  return { getValue:()=>value.trim(), setValue:(next)=>{value=next;keyboard.value=next;recognized.value=next;autoSize(keyboard);} };
}

function autoSize(textarea) { textarea.style.height='auto'; textarea.style.height=`${Math.min(210,Math.max(132,textarea.scrollHeight))}px`; }
