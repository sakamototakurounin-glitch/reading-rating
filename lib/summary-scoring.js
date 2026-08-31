const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const halfPoint=(value,min,max)=>clamp(Math.round((Number(value)||0)*2)/2,min,max);

export function normalizeSummaryGrade(grade) {
  if(!Array.isArray(grade?.elements)||grade.elements.length!==6)throw new Error('Summary grade must contain exactly six elements');
  const elements=grade.elements.map((element)=>({name:String(element?.name||''),score:halfPoint(element?.score,0,1),reason:String(element?.reason||'')}));
  const elementScore=halfPoint(elements.reduce((sum,element)=>sum+element.score,0),0,6);
  const impressionScore=halfPoint(grade.impressionScore,0,5);
  const rawScore=halfPoint(elementScore+impressionScore,0,11);
  return {...grade,elements,elementScore,impressionScore,rawScore,displayScore:Math.min(10,rawScore),feedback:String(grade.feedback||''),modelSummary:String(grade.modelSummary||grade.modelAnswer||'')};
}
