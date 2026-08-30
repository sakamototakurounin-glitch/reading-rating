import { RATING } from './config.js';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const displayRating = (internalRating) => Math.min(100, Math.round(Math.max(0, internalRating)));
export const passageRating = (difficulty) => RATING.passageBase + RATING.passageStep * clamp(Math.round(difficulty), 0, RATING.difficultyMax);
export const userLevel = (internalRating) => clamp(Math.floor(Math.max(0, internalRating) / 5), 0, RATING.levelMax);
export const expectedAccuracy = (internalRating, difficulty) => {
  const difference = internalRating - passageRating(difficulty);
  return 1 / (1 + Math.exp(-(Math.log(2) + RATING.accuracySlope * difference)));
};
export const updateRating = (oldRating, actualAccuracy, expected) => {
  const delta = clamp(RATING.updateK * (actualAccuracy - expected), -RATING.deltaMax, RATING.deltaMax);
  return { delta, newRating: Math.max(0, oldRating + delta) };
};
