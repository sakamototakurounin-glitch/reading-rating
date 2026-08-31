function fisherYates(items, random) {
  const shuffled=[...items];
  for(let index=shuffled.length-1;index>0;index-=1){
    const target=Math.floor(random()*(index+1));
    [shuffled[index],shuffled[target]]=[shuffled[target],shuffled[index]];
  }
  return shuffled;
}

export function balancedAnswerPositions(questionCount, random=Math.random) {
  const positions=[];
  const baseCount=Math.floor(questionCount/4);
  for(let repeat=0;repeat<baseCount;repeat+=1)positions.push(0,1,2,3);
  positions.push(...fisherYates([0,1,2,3],random).slice(0,questionCount%4));
  const shuffled=fisherYates(positions,random);
  const cyclic=shuffled.length>=4&&shuffled.every((value,index)=>value===(shuffled[0]+index)%4);
  if(cyclic)[shuffled[shuffled.length-1],shuffled[shuffled.length-2]]=[shuffled[shuffled.length-2],shuffled[shuffled.length-1]];
  return shuffled;
}

export function shuffleQuestionChoices(question, correctPosition, random=Math.random) {
  const items=fisherYates(question.choices.map((text,index)=>({text,isCorrect:index===question.answer})),random);
  const currentCorrect=items.findIndex((item)=>item.isCorrect);
  [items[currentCorrect],items[correctPosition]]=[items[correctPosition],items[currentCorrect]];
  return {...question,choices:items.map((item)=>item.text),answer:items.findIndex((item)=>item.isCorrect)};
}

export function balanceLongChoices(content, random=Math.random) {
  const positions=balancedAnswerPositions(content.questions.length,random);
  return {...content,questions:content.questions.map((question,index)=>shuffleQuestionChoices(question,positions[index],random))};
}

export function balanceQuickChoices(passages, random=Math.random) {
  const questionCount=passages.reduce((sum,passage)=>sum+passage.questions.length,0);
  const positions=balancedAnswerPositions(questionCount,random); let cursor=0;
  return passages.map((passage)=>({...passage,questions:passage.questions.map((question)=>shuffleQuestionChoices(question,positions[cursor++],random))}));
}
