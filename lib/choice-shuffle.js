export function fisherYates(items, random=Math.random) {
  const shuffled=[...items];
  for(let index=shuffled.length-1;index>0;index-=1){
    const target=Math.floor(random()*(index+1));
    [shuffled[index],shuffled[target]]=[shuffled[target],shuffled[index]];
  }
  return shuffled;
}

export function shuffleQuestionChoices(question, random=Math.random) {
  const items=fisherYates(question.choices.map((text,index)=>({text,isCorrect:index===question.answer})),random);
  return {...question,choices:items.map((item)=>item.text),answer:items.findIndex((item)=>item.isCorrect)};
}

export function shuffleLongChoices(content, random=Math.random) {
  return {...content,questions:content.questions.map((question)=>shuffleQuestionChoices(question,random))};
}

export function shuffleQuickChoices(passages, random=Math.random) {
  return passages.map((passage)=>({...passage,questions:passage.questions.map((question)=>shuffleQuestionChoices(question,random))}));
}
