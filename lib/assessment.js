export const QUESTION_LIMITS = Object.freeze({ quick: 30, long: 60 });

export function countWords(text = '') {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

export function longReadingLimitSeconds(text = '') {
  const rawSeconds = countWords(text) / 50 * 60;
  return Math.max(30, Math.round(rawSeconds / 30) * 30);
}

export function assertFourChoiceQuestions(questions, expectedCount, mode='long') {
  if (!Array.isArray(questions) || questions.length !== expectedCount) {
    throw new Error(`Expected exactly ${expectedCount} questions`);
  }
  for (const question of questions) {
    if (!Array.isArray(question.choices) || question.choices.length !== 4) {
      throw new Error('Every question must have exactly four choices');
    }
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
      throw new Error('Every question must have one valid answer');
    }
    if (!question.explanation || !question.evidence) {
      throw new Error('Every question must include an explanation and evidence');
    }
    const lengths=question.choices.map((choice)=>countWords(choice));
    const minimum=mode==='quick'?10:12;
    if(Math.min(...lengths)<minimum) throw new Error(`Every ${mode} choice must be a complete, informative sentence`);
    if(Math.max(...lengths)/Math.min(...lengths)>1.8) throw new Error('Choice lengths must be balanced');
    const distractorMax=Math.max(...lengths.filter((_,index)=>index!==question.answer));
    if(lengths[question.answer]>distractorMax*1.3) throw new Error('The correct choice must not be conspicuously longest');
  }
  return questions;
}

export function validateQuickSet(passages) {
  if (!Array.isArray(passages) || passages.length !== 3) throw new Error('Quick requires three passages');
  passages.forEach((passage) => {
    if (!passage.translation) throw new Error('Quick passage translation is required');
    assertFourChoiceQuestions(passage.questions, 3, 'quick');
  });
  return passages;
}

export function validateLongContent(content) {
  if (!content?.passage || !content.translation || !content.sampleSummary) throw new Error('Long content is incomplete');
  assertFourChoiceQuestions(content.questions, 5, 'long');
  return content;
}
