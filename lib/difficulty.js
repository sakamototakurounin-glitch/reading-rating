import { RATING } from './config.js';
import { clamp, userLevel } from './rating.js';

export function candidateDifficulties(internalRating) {
  const level = userLevel(internalRating);
  return RATING.offsets.map(({ offset }) => clamp(level + offset, 0, RATING.difficultyMax));
}

export function selectDifficulty(internalRating, random = Math.random()) {
  const level = userLevel(internalRating);
  let cursor = 0;
  const picked = RATING.offsets.find(({ probability }) => {
    cursor += probability;
    return random < cursor;
  }) || RATING.offsets.at(-1);
  return clamp(level + picked.offset, 0, RATING.difficultyMax);
}
