import { QUICK } from './config.js';

// Target speed is used only to calculate the deadline, never as a measured WPM record.
export function quickReadingLimitSeconds(wordCount, rating) {
  if (!Number.isFinite(wordCount) || wordCount <= 0) throw new RangeError('Invalid Quick word count');
  const timingRating = Math.max(QUICK.minimumTimingRating, Number(rating) || 0);
  return Math.max(1, Math.ceil(wordCount * 60 / (timingRating * QUICK.speedPerRating)));
}

export function updateQuickRating(oldRating, correctAnswers) {
  if (!Number.isInteger(correctAnswers) || correctAnswers < 0 || correctAnswers > 9) throw new RangeError('Invalid Quick answer count');
  const before = Math.max(0, Number(oldRating) || 0);
  const adjustment = correctAnswers >= 5 ? QUICK.ratingDeltas[correctAnswers] : QUICK.ratingDeltas.low;
  const newRating = Math.max(0, before + adjustment);
  return { delta: newRating - before, newRating };
}
