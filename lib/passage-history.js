export const PASSAGE_HISTORY_LIMIT = 50;

const words = (value='') => String(value).toLowerCase().match(/[a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g) || [];
const set = (values=[]) => new Set(values.flatMap(words));

export function passageRecord(content, difficulty='quick') {
  return {
    title: String(content.title || content.topic || 'Untitled'),
    topic: String(content.topic || ''),
    shortSummary: String(content.shortSummary || content.centralThesis || '').slice(0, 360),
    centralThesis: String(content.centralThesis || content.shortSummary || '').slice(0, 360),
    keywords: Array.isArray(content.keywords) ? content.keywords.slice(0, 10).map(String) : [],
    mainExamples: Array.isArray(content.mainExamples) ? content.mainExamples.slice(0, 6).map(String) : [],
    category: String(content.category || 'general'),
    difficulty,
    date: new Date().toISOString(),
  };
}

export function addPassagesToHistory(history=[], contents=[], difficulty='quick') {
  return [...contents.map((content)=>passageRecord(content,difficulty)), ...history].slice(0,PASSAGE_HISTORY_LIMIT);
}

export function similarityScore(candidate, previous) {
  const a=set([candidate.title,candidate.topic,candidate.shortSummary,candidate.centralThesis,candidate.keywords,candidate.mainExamples]);
  const b=set([previous.title,previous.topic,previous.shortSummary,previous.centralThesis,previous.keywords,previous.mainExamples]);
  if(!a.size||!b.size)return 0;
  const intersection=[...a].filter((token)=>b.has(token)).length;
  return intersection/Math.min(a.size,b.size);
}

export function isTooSimilar(candidate, history=[], threshold=.58) {
  return history.some((previous)=>similarityScore(candidate,previous)>=threshold);
}

export function recentHistoryForPrompt(history=[]) {
  return history.slice(0,PASSAGE_HISTORY_LIMIT).map(({title,topic,shortSummary,centralThesis,keywords,mainExamples,category,difficulty,date})=>({title,topic,shortSummary,centralThesis,keywords,mainExamples,category,difficulty,date}));
}
