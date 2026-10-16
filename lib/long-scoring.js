import { displaySummaryScore } from './summary-scoring.js';

export const LONG_SCORING = Object.freeze({ version:'long-30-v1', questionCount:5, pointsPerQuestion:4, multipleChoiceMax:20, summaryMax:10, scoreMax:30 });
export function scoreLong(correctAnswers, rawSummaryScore) {
  if(!Number.isInteger(correctAnswers)||correctAnswers<0||correctAnswers>5)throw new Error('Long correct-answer count must be 0–5');
  const multipleChoiceScore=correctAnswers*LONG_SCORING.pointsPerQuestion;
  const summaryScore=displaySummaryScore(rawSummaryScore);
  const totalScore=multipleChoiceScore+summaryScore;
  return {multipleChoiceScore,summaryScore,totalScore,actualAccuracy:totalScore/LONG_SCORING.scoreMax};
}
// Old saved sessions remain on their original 25-point scale. Never rescore history.
export const longScoreMax=(record)=>record?.scoreMax===30?30:25;
export const longChoiceMax=(record)=>record?.multipleChoiceMax===20?20:15;
