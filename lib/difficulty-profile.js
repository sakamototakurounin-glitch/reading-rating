const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (start, end, normalized) => Number((start + (end - start) * normalized).toFixed(3));

export function buildDifficultyProfile(value) {
  const difficulty = Math.max(0, Math.min(17, Math.round(Number(value) || 0)));
  const normalizedDifficulty = Number((difficulty / 17).toFixed(3));
  const n = normalizedDifficulty;
  const vocabularyLevel = Math.max(0, difficulty - 2);
  const vocabularyNormalized = vocabularyLevel / 17;
  return Object.freeze({
    difficulty,
    normalizedDifficulty,
    vocabularyLevel,
    vocabularyLevelOffset: -2,
    vocabularyDifficulty: smooth(0.08, 0.74, vocabularyNormalized),
    choiceSimilarity: smooth(0.35, 0.95, n),
    syntaxComplexity: smooth(0.056, 0.874, n),
    syntaxAdjustment: 0.93,
    abstraction: smooth(0.02, 0.95, n),
    informationDensity: smooth(0.08, 0.94, n),
    inferenceRequirement: smooth(0.02, 0.96, n),
    discourseComplexity: smooth(0.04, 0.96, n),
    rareVocabularyAllowance: smooth(0.005, 0.22, vocabularyNormalized),
    targetSentenceWords: Math.round(11 + 12 * n),
    anchor: difficulty === 2 ? 'Eiken Grade 2' : difficulty === 7 ? 'Eiken Pre-1' : difficulty === 12 ? 'Eiken Grade 1' : difficulty === 17 ? 'Above Eiken Grade 1 / maximum' : 'Interpolated between fixed anchors',
  });
}

export function difficultyPrompt(profile) {
  const p = profile;
  const low = p.difficulty <= 2 ? 'Use mainly everyday, high-frequency vocabulary, short-to-medium sentences, explicit connections, concrete examples, and very little inference. Difficulty 0 must be clearly easier than Eiken Grade 2; Difficulty 2 should reach Eiken Grade 2.' : '';
  const middle = p.difficulty >= 3 && p.difficulty <= 11 ? 'Increase challenge gradually through precise paraphrase, mildly layered syntax, abstraction, and inference. Difficulty 7 should match Eiken Pre-1; Difficulty 8–11 should progress smoothly toward but remain below Eiken Grade 1.' : '';
  const high = p.difficulty >= 12 ? 'Difficulty 12 should match a demanding Eiken Grade 1 passage, not a graduate specialist paper. Above 12, add subtle qualification, cross-sentence relationships, plausible competing interpretations, layered syntax, and compressed reasoning. Do not create difficulty by packing paragraphs with rare words.' : '';
  return `Use this continuous generation profile: ${JSON.stringify(p)}. ${low} ${middle} ${high} These anchors describe reasoning and overall reading demand. Override their vocabulary expectations: passage vocabulary must be calibrated to Level ${p.vocabularyLevel}, exactly two levels below the requested level, with a floor at Level 0. Apply the same lower vocabulary ceiling to questions and options. Follow the reduced vocabularyDifficulty and rareVocabularyAllowance numerically; simplify word choice while preserving the passage's reasoning and information. Keep each step from 0 to 17 perceptibly but smoothly harder. ${choiceSimilarityPrompt(p.choiceSimilarity)} Syntax has been reduced slightly: avoid excessive clause stacking, long parenthetical insertions, overloaded sentences, and distant referents. Even at 17, logic, abstraction, information density, discourse, qualification, conflicting evidence, causal chains, cross-paragraph synthesis, and inference—not syntactic parsing alone—must carry most of the difficulty. Aim for an average sentence length near ${p.targetSentenceWords} words while varying sentences naturally.`;
}

export function choiceSimilarityPrompt(similarity = 0.65) {
  return `Increase option difficulty through semantic similarity (target ${similarity}), never through harder vocabulary. All four options must address the same event, mechanism, or interpretation and share a comparable structure and specificity. Build realistic near-miss distractors using passage facts but change a decisive cause, condition, exception, chronology, scope, actor, or degree of certainty. At lower levels use clearly stated distinctions; progressively require closer comparison and integration of evidence at higher levels. Keep exactly one fully supported answer. Do not use absurd, unrelated, obviously absolute, overlapping, or equally defensible distractors. Explain the precise passage-based distinction that excludes each distractor.`;
}

export function normalizedDifficulty(value) {
  return clamp01((Number(value) || 0) / 17);
}
