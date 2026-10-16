export const CONCISE_MEANING_FORMAT='short-ja-v2';
// Do not special-case particular words or cut definitions mechanically.
export const shortKnownMeaning=(_word,meaning)=>String(meaning||'').trim();
export function isConciseJapaneseMeaning(value) {
  const text=String(value||'').trim();
  if(!/[\u3040-\u30ff\u3400-\u9fff]/.test(text)||[...text].length>24)return false;
  // Detect explanatory definitions, without clipping or guessing a replacement.
  return !(text.length>10&&/(?:こと|過程|仕組み|ためのもの|という意味|という性質)[。．.]?$/.test(text));
}
export const needsConciseMeaning=(entry)=>entry?.meaningFormat!==CONCISE_MEANING_FORMAT||!isConciseJapaneseMeaning(entry?.generalMeaning);

export async function repairConciseMeanings(entries,passage,fetcher=globalThis.fetch){
  const result=entries.map(entry=>({...entry}));
  const pending=[...new Set(result.filter(needsConciseMeaning).map(entry=>String(entry.word||'').trim().toLowerCase()).filter(Boolean))];
  for(let start=0;start<pending.length;start+=40){
    const words=pending.slice(start,start+40);
    try{
      const response=await fetcher('/api/lookup-words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passage:passage||'',words,meaningsOnly:true,entries:result.filter(entry=>words.includes(entry.word.toLowerCase())).map(({word,generalMeaning})=>({word,generalMeaning}))})});
      if(!response.ok)continue;
      const data=await response.json();if(!Array.isArray(data))continue;
      const replacements=new Map(data.filter(entry=>words.includes(String(entry.word||'').toLowerCase())&&!needsConciseMeaning(entry)).map(entry=>[entry.word.toLowerCase(),entry.generalMeaning]));
      for(const entry of result){const meaning=replacements.get(entry.word.toLowerCase());if(meaning){entry.generalMeaning=meaning;entry.meaningFormat=CONCISE_MEANING_FORMAT;}}
    }catch{/* Preserve the original stored definitions; the UI offers retry. */}
  }
  return {entries:result,unresolved:result.filter(needsConciseMeaning).map(entry=>entry.word)};
}
