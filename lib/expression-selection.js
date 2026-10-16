// Stable occurrence IDs: repeated words can be selected independently.
export function passageWordTokens(passage='') {
  const text=String(passage),tokens=[];
  for(const match of text.matchAll(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g)){
    tokens.push({index:tokens.length,word:match[0].toLowerCase().replaceAll('’',"'"),text:match[0],start:match.index,end:match.index+match[0].length});
  }
  return tokens;
}

export function selectedWordRuns(passage,selectedTokenIndices){
  const tokens=passageWordTokens(passage),selected=new Set(selectedTokenIndices),runs=[];
  for(const token of tokens){
    if(!selected.has(token.index))continue;
    const run=runs.at(-1),previous=run?.at(-1);
    // Only whitespace inside the same paragraph may connect selected words.
    const gap=previous?passage.slice(previous.end,token.start):'';
    if(previous&&token.index===previous.index+1&&/^\s+$/.test(gap)&&!/[\r\n]\s*[\r\n]/.test(gap))run.push(token);
    else runs.push([token]);
  }
  return runs;
}

export function expressionCandidates(passage,selectedTokenIndices){
  return selectedWordRuns(passage,selectedTokenIndices).filter(run=>run.length>=2);
}

// Reject invented, overlapping, or out-of-range model spans. Never lose a word.
export function validateExpressionGroups(runs,groups){
  if(!Array.isArray(groups))throw Error('Invalid expression response');
  const used=new Set(),validated=[];
  for(const group of groups){
    const {runIndex,start,end}=group;
    if(!Number.isInteger(runIndex)||!Number.isInteger(start)||!Number.isInteger(end)||!runs[runIndex]||start<0||end<=start||end>=runs[runIndex].length)throw Error('Invalid expression span');
    for(let i=start;i<=end;i++){const key=`${runIndex}:${i}`;if(used.has(key))throw Error('Overlapping expressions');used.add(key);}
    validated.push({runIndex,start,end});
  }
  return validated.sort((a,b)=>a.runIndex-b.runIndex||a.start-b.start);
}

export function vocabularyFromSelection(passage,selectedTokenIndices,groups=[]){
  const runs=selectedWordRuns(passage,selectedTokenIndices),candidates=runs.filter(run=>run.length>=2);
  const valid=validateExpressionGroups(candidates,groups),entries=[];
  for(const run of runs){
    const runIndex=candidates.indexOf(run);
    for(let i=0;i<run.length;i++){
      const group=valid.find(item=>item.runIndex===runIndex&&item.start===i);
      if(group){entries.push(run.slice(i,group.end+1).map(token=>token.word).join(' '));i=group.end;}
      else entries.push(run[i].word);
    }
  }
  return [...new Set(entries)];
}

export async function resolveSelectedVocabulary(passage,selectedTokenIndices,fetcher=globalThis.fetch){
  const runs=expressionCandidates(passage,selectedTokenIndices);
  if(!runs.length)return vocabularyFromSelection(passage,selectedTokenIndices);
  const response=await fetcher('/api/classify-expressions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passage,selectedTokenIndices})});
  if(!response.ok)throw Error('Expression classification unavailable');
  const data=await response.json();
  return vocabularyFromSelection(passage,selectedTokenIndices,data.groups);
}
