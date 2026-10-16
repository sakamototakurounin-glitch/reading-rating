import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';
import { CONCISE_MEANING_FORMAT, isConciseJapaneseMeaning, shortKnownMeaning } from '../lib/vocabulary-meaning.js';

const schema={type:'object',additionalProperties:false,required:['entries'],properties:{entries:{type:'array',minItems:1,maxItems:40,items:{type:'object',additionalProperties:false,required:['word','contextMeaning','generalMeaning','partOfSpeech','exampleSentence'],properties:{word:{type:'string'},contextMeaning:{type:'string'},generalMeaning:{type:'string'},partOfSpeech:{type:'string'},exampleSentence:{type:'string'}}}}}};

const conciseRule=`generalMeaning must be a short Japanese dictionary equivalent, NOT an explanation or an English definition. A requested item can contain multiple words: keep it intact and translate the whole expression (take into account = 考慮する). Prefer the established Japanese term: photosynthesis = 光合成; magnification = 拡大、倍率; sustain = 維持する、持続させる. Return 1–3 concise equivalents, preferably 2–12 Japanese characters and at most 24 characters total. Do not explain a process as “光エネルギーを利用して有機物を作る過程” or “物の大きさを実際より大きく見せること”. Do not add “〜すること”, textbook explanations, introductory labels, or vague placeholders. Preserve the word's basic meaning; do not shorten by cutting a definition midway.`;
const promptFor=(requested,passage)=>`${conciseRule} Each requested item may be a single word OR a multiword idiom, phrasal verb, fixed expression, or compound noun. Keep every requested item intact in word; give the concise Japanese meaning of the WHOLE expression, not separate definitions of its component words. contextMeaning must also be concise Japanese. partOfSpeech and exampleSentence may be English. The example must use the whole expression naturally, be newly written, and must not copy a sentence from the passage. Never answer only “文脈に依存” or another vague placeholder.\n\nWORDS: ${requested.join(', ')}\n\nPASSAGE:\n${String(passage).slice(0,14000)}`;
const correctionSchema={type:'object',additionalProperties:false,required:['entries'],properties:{entries:{type:'array',minItems:1,maxItems:40,items:{type:'object',additionalProperties:false,required:['word','generalMeaning'],properties:{word:{type:'string'},generalMeaning:{type:'string'}}}}}};

export default async function handler(request,response) {
  if(request.method!=='POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const {passage,words,meaningsOnly,entries:previousEntries}=parseRequest(request);
    const requested=Array.isArray(words)?words.map(String).filter(Boolean).slice(0,40):[];
    if((!passage&&!meaningsOnly)||!requested.length) return jsonResponse(response,400,{error:'passage and words are required'});
    let data=await structuredCompletion({
      system:'You provide concise, concrete English vocabulary help in Japanese. Return only structured data.',
      user:meaningsOnly?`${conciseRule}\nReturn generalMeaning for EVERY requested word, not just the example words above. Correct old definitions into conventional short translation equivalents. Do not return examples or other fields.\nWORDS: ${requested.join(', ')}\nPREVIOUS: ${JSON.stringify(Array.isArray(previousEntries)?previousEntries.filter(entry=>requested.includes(entry.word)).map(({word,generalMeaning})=>({word,generalMeaning:String(generalMeaning||'').slice(0,300)})):[])}\nPASSAGE:\n${String(passage||'').slice(0,14000)}`:promptFor(requested,passage),
      schema:meaningsOnly?correctionSchema:schema,
    });
    data.entries=data.entries.map(entry=>({...entry,generalMeaning:shortKnownMeaning(entry.word,entry.generalMeaning)}));
    const invalid=data.entries.filter((entry)=>!isConciseJapaneseMeaning(entry.generalMeaning));
    if(invalid.length){
      const corrected=await structuredCompletion({system:'You return short Japanese dictionary equivalents, not explanatory definitions. Return only structured data.',user:`${conciseRule}\nCorrect only generalMeaning for these entries. Do not regenerate examples or other fields.\nENTRIES: ${JSON.stringify(invalid.map(({word,generalMeaning})=>({word,generalMeaning})))}\nPASSAGE:\n${String(passage).slice(0,14000)}`,schema:correctionSchema});
      const replacements=new Map(corrected.entries.map((entry)=>[entry.word.toLowerCase(),entry.generalMeaning]));
      data={entries:data.entries.map((entry)=>({...entry,generalMeaning:shortKnownMeaning(entry.word,replacements.get(entry.word.toLowerCase())||entry.generalMeaning)}))};
    }
    const valid=new Map(data.entries.filter(entry=>requested.some(word=>word.toLowerCase()===entry.word.toLowerCase())&&isConciseJapaneseMeaning(entry.generalMeaning)).map(entry=>[entry.word.toLowerCase(),entry]));
    data.entries=requested.map(word=>{const entry=valid.get(word.toLowerCase());return entry?{...entry,word,meaningFormat:CONCISE_MEANING_FORMAT}:{word,generalMeaning:'意味を取得できませんでした'};});
    jsonResponse(response,200,data.entries);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
