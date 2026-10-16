import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';
import { isConciseJapaneseMeaning, shortKnownMeaning } from '../lib/vocabulary-meaning.js';

const schema={type:'object',additionalProperties:false,required:['entries'],properties:{entries:{type:'array',minItems:1,maxItems:40,items:{type:'object',additionalProperties:false,required:['word','contextMeaning','generalMeaning','partOfSpeech','exampleSentence'],properties:{word:{type:'string'},contextMeaning:{type:'string'},generalMeaning:{type:'string'},partOfSpeech:{type:'string'},exampleSentence:{type:'string'}}}}}};

const conciseRule=`generalMeaning must be a short Japanese dictionary equivalent, NOT an explanation or an English definition. Prefer the established Japanese term: photosynthesis = 光合成; magnification = 拡大、倍率; sustain = 維持する、持続させる. Return 1–3 concise equivalents, preferably 2–12 Japanese characters and at most 24 characters total. Do not explain a process as “光エネルギーを利用して有機物を作る過程” or “物の大きさを実際より大きく見せること”. Do not add “〜すること”, textbook explanations, introductory labels, or vague placeholders. Preserve the word's basic meaning; do not shorten by cutting a definition midway.`;
const promptFor=(requested,passage)=>`${conciseRule} contextMeaning must also be concise Japanese. partOfSpeech and exampleSentence may be English. The example must be newly written and must not copy a sentence from the passage. Never answer only “文脈に依存” or another vague placeholder.\n\nWORDS: ${requested.join(', ')}\n\nPASSAGE:\n${String(passage).slice(0,14000)}`;
const correctionSchema={type:'object',additionalProperties:false,required:['entries'],properties:{entries:{type:'array',minItems:1,maxItems:40,items:{type:'object',additionalProperties:false,required:['word','generalMeaning'],properties:{word:{type:'string'},generalMeaning:{type:'string'}}}}}};

export default async function handler(request,response) {
  if(request.method!=='POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const {passage,words}=parseRequest(request);
    const requested=Array.isArray(words)?words.map(String).filter(Boolean).slice(0,40):[];
    if(!passage||!requested.length) return jsonResponse(response,400,{error:'passage and words are required'});
    let data=await structuredCompletion({
      system:'You provide concise, concrete English vocabulary help in Japanese. Return only structured data.',
      user:promptFor(requested,passage),
      schema,
    });
    data.entries=data.entries.map(entry=>({...entry,generalMeaning:shortKnownMeaning(entry.word,entry.generalMeaning)}));
    const invalid=data.entries.filter((entry)=>!isConciseJapaneseMeaning(entry.generalMeaning));
    if(invalid.length){
      const corrected=await structuredCompletion({system:'You return short Japanese dictionary equivalents, not explanatory definitions. Return only structured data.',user:`${conciseRule}\nCorrect only generalMeaning for these entries. Do not regenerate examples or other fields.\nENTRIES: ${JSON.stringify(invalid.map(({word,generalMeaning})=>({word,generalMeaning})))}\nPASSAGE:\n${String(passage).slice(0,14000)}`,schema:correctionSchema});
      const replacements=new Map(corrected.entries.map((entry)=>[entry.word.toLowerCase(),entry.generalMeaning]));
      data={entries:data.entries.map((entry)=>({...entry,generalMeaning:shortKnownMeaning(entry.word,replacements.get(entry.word.toLowerCase())||entry.generalMeaning)}))};
    }
    data.entries=data.entries.map((entry)=>({...entry,generalMeaning:isConciseJapaneseMeaning(entry.generalMeaning)?entry.generalMeaning:'意味を取得できませんでした'}));
    jsonResponse(response,200,data.entries);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
