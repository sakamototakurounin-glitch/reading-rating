export function normalizeUnknownWord(entry = {}) {
  const word = String(entry.word || '').trim();
  const generalMeaning = String(entry.generalMeaning || entry.basicMeaning || entry.contextMeaning || '意味情報を再取得してください。').trim();
  return {
    word,
    generalMeaning,
    exampleSentence: String(entry.exampleSentence || '').trim(),
    contextMeaning: String(entry.contextMeaning || '').trim(),
    partOfSpeech: String(entry.partOfSpeech || '').trim(),
    pending: Boolean(entry.pending)
  };
}

export function normalizeUnknownWords(entries = []) {
  return entries.map(normalizeUnknownWord).filter((entry) => entry.word);
}

export function historyRecordId(mode, record, index = 0) {
  if (record?.id) return String(record.id);
  return `${mode}-${record?.date || 'unknown'}-${index}`;
}
