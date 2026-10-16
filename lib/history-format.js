import { shortKnownMeaning } from './vocabulary-meaning.js';
const JAPANESE_CHARACTERS = /[\u3040-\u30ff\u3400-\u9fff]/;

export function isJapaneseMeaning(value) {
  return JAPANESE_CHARACTERS.test(String(value || ''));
}

export function normalizeUnknownWord(entry = {}) {
  const word = String(entry.word || '').trim();
  const candidate = shortKnownMeaning(word,entry.generalMeaning || entry.basicMeaning || entry.contextMeaning || '');
  const generalMeaning = isJapaneseMeaning(candidate) ? candidate : '意味を取得できませんでした';
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
