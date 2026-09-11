import test from 'node:test';
import assert from 'node:assert/strict';
import { isJapaneseMeaning, normalizeUnknownWord } from '../lib/history-format.js';

test('unknown word meanings must contain Japanese characters', () => {
  assert.equal(isJapaneseMeaning('維持する、持続させる'), true);
  assert.equal(isJapaneseMeaning('to continue something over time'), false);
});

test('English-only meanings never reach history or Vocabstar snapshots', () => {
  assert.equal(normalizeUnknownWord({word:'sustain',generalMeaning:'to continue something over time'}).generalMeaning,'意味を取得できませんでした');
  assert.equal(normalizeUnknownWord({word:'sustain',basicMeaning:'維持する'}).generalMeaning,'維持する');
});
