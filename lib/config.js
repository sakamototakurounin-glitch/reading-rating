export const RATING = Object.freeze({
  difficultyMin: 0,
  difficultyMax: 17,
  levelMax: 20,
  passageBase: 2.5,
  passageStep: 5,
  accuracySlope: 0.06,
  updateK: 7.5,
  deltaMax: 2.5,
  anchors: Object.freeze({ eiken2: 12.5, pre1: 37.5, eiken1: 62.5, highest: 87.5 }),
  offsets: Object.freeze([
    { offset: 1, probability: 0.2 },
    { offset: 0, probability: 0.3 },
    { offset: -1, probability: 0.25 },
    { offset: -2, probability: 0.15 },
    { offset: -3, probability: 0.1 },
  ]),
});

export const QUICK = Object.freeze({
  passageCount: 3,
  questionsPerPassage: 3,
  initialTimeLimitSeconds: 120,
  minTimeLimitSeconds: 45,
  maxTimeLimitSeconds: 300,
  adjustments: Object.freeze({ 9: -15, 8: -10, 7: 0, 6: 10, low: 20 }),
});
