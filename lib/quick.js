import { QUICK } from './config.js';
import { clamp } from './rating.js';

export const calculateWpm = (wordCount, seconds) => Math.round(wordCount / Math.max(seconds / 60, 1 / 60));
export function nextTimeLimit(currentSeconds, correctAnswers) {
  const adjustment = correctAnswers >= 7
    ? QUICK.adjustments[correctAnswers]
    : correctAnswers === 6 ? QUICK.adjustments[6] : QUICK.adjustments.low;
  return clamp(currentSeconds + adjustment, QUICK.minTimeLimitSeconds, QUICK.maxTimeLimitSeconds);
}

export function nextRecentTimeLimit(currentSeconds, correctAnswers, history = []) {
  const recent = [correctAnswers, ...history.slice(0, 2).map(r => r.correctAnswers)].filter(Number.isFinite);
  return nextTimeLimit(currentSeconds, Math.round(recent.reduce((a, b) => a + b, 0) / recent.length));
}
