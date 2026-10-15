import { fisherYates } from './choice-shuffle.js';

const cache = new Map();
export async function loadBank(mode, level, fetcher = globalThis.fetch) {
  const path = mode === 'quick' ? '/data/banks/quick.json' : `/data/banks/long/level-${level}.json`;
  if (!cache.has(path)) {
    cache.set(path, (async () => {
      const response = await fetcher(path);
      if (!response.ok) throw new Error('問題バンクを読み込めませんでした');
      const json = await response.json();
      const items = mode === 'quick' ? json.passages : json.items;
      if (!Array.isArray(items) || !items.length) throw new Error('問題バンクが空です');
      return items;
    })().catch(error => { cache.delete(path); throw error; }));
  }
  return cache.get(path);
}

export function chooseLongLevel(rating, random = Math.random()) {
  const r = Math.max(0, Math.min(100, Number(rating) || 0));
  return Math.max(0, Math.min(9, Math.round(r / 10 + (random * 2 - 1))));
}

// Consume the tail before a fresh cycle. Skipped same-session IDs stay in the queue.
export function takeBankItems(bank, previous, count, random = Math.random) {
  const ids = bank.map(p => p.id), allowed = new Set(ids);
  if (allowed.size !== ids.length || count > ids.length) throw new Error('問題バンクのID・件数が不正です');
  let remaining = Array.isArray(previous?.remaining) ? [...new Set(previous.remaining)].filter(id => allowed.has(id)) : fisherYates(ids, random);
  const selected = [];
  let cycle = Number(previous?.cycle) || 0;
  let lastId = previous?.lastId;
  while (selected.length < count) {
    if (!remaining.length) { remaining = fisherYates(ids, random); cycle += 1; }
    let index = remaining.findIndex(id => !selected.includes(id) && (ids.length === 1 || id !== lastId));
    if (index < 0) index = remaining.findIndex(id => !selected.includes(id));
    if (index < 0) throw new Error('重複しない問題を選べませんでした');
    const [id] = remaining.splice(index, 1);
    selected.push(id); lastId = id;
  }
  return { items: selected.map(id => bank.find(p => p.id === id)), progress: { remaining, cycle, lastId } };
}

function adaptQuestion(id, prompt, options, correctId, explanation, evidence, random) {
  if (options.length !== 4 || new Set(options.map(c => c.id)).size !== 4 || options.filter(c => c.id === correctId).length !== 1) throw new Error('4択・正解IDが不正です');
  const choices = fisherYates(options, random);
  return { id, prompt, choices: choices.map(c => c.text), choiceIds: choices.map(c => c.id), correctChoiceId: correctId,
    answer: choices.findIndex(c => c.id === correctId), explanation: typeof explanation === 'function' ? explanation(choices) : explanation, evidence };
}

export function adaptQuick(p, random = Math.random) {
  return { id: p.id, bankId: p.id, title: p.title, topic: p.topic || p.document_type || '', passage: p.passage,
    wordCount: p.difficulty.word_count, translation: 'この教材の日本語訳は未収録です。',
    questions: p.questions.map(q => adaptQuestion(q.id, q.prompt, q.options, q.answer_id, q.explanation, q.evidence.quote, random)) };
}

export function adaptLong(p, random = Math.random) {
  const paragraphs = p.passage.paragraphs;
  return { id: p.id, bankId: p.id, title: p.passage.title, topic: p.domain_ja || '', difficulty: p.level,
    passage: paragraphs.map(v => v.text).join('\n\n'), wordCount: p.word_count, translation: 'この教材の日本語訳は未収録です。',
    questions: p.questions.map(q => adaptQuestion(q.id, q.stem, q.choices, q.correct_choice_id,
      choices => choices.map((c, i) => `${'ABCD'[i]}: ${c.rationale}`).join('\n'),
      paragraphs.filter(v => q.evidence_paragraph_ids.includes(v.id)).map(v => `[${v.id}] ${v.text}`).join('\n\n'), random)) };
}

export function isCorrectAnswer(answer) {
  if (answer.selectedId !== undefined && answer.answerId !== undefined) return answer.selectedId !== null && answer.selectedId === answer.answerId;
  return answer.selected !== null && answer.selected !== undefined && answer.selected === answer.answer;
}
