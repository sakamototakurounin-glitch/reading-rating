import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';
import { isJapaneseMeaning } from '../lib/history-format.js';

const schema={type:'object',additionalProperties:false,required:['entries'],properties:{entries:{type:'array',minItems:1,maxItems:40,items:{type:'object',additionalProperties:false,required:['word','contextMeaning','generalMeaning','partOfSpeech','exampleSentence'],properties:{word:{type:'string'},contextMeaning:{type:'string'},generalMeaning:{type:'string'},partOfSpeech:{type:'string'},exampleSentence:{type:'string'}}}}}};

const promptFor=(requested,passage,correction='')=>`For every requested word, return generalMeaning as a concrete basic dictionary meaning written entirely in Japanese. English definitions in generalMeaning are prohibited. contextMeaning must also be Japanese. partOfSpeech and exampleSentence may be English. The example must be newly written and must not copy a sentence from the passage. Never answer only “文脈に依存” or another vague placeholder. Example: {"word":"sustain","generalMeaning":"維持する、持続させる","exampleSentence":"The company struggled to sustain its growth."} ${correction}\n\nWORDS: ${requested.join(', ')}\n\nPASSAGE:\n${String(passage).slice(0,14000)}`;

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
    const invalid=data.entries.filter((entry)=>!isJapaneseMeaning(entry.generalMeaning)).map((entry)=>entry.word);
    if(invalid.length){
      const corrected=await structuredCompletion({system:'You translate English dictionary definitions into concise Japanese. Return only structured data.',user:promptFor(invalid,passage,'The previous generalMeaning values were English-only. Correct only these entries, and ensure every generalMeaning contains Japanese characters.'),schema});
      const replacements=new Map(corrected.entries.map((entry)=>[entry.word.toLowerCase(),entry]));
      data={entries:data.entries.map((entry)=>replacements.get(entry.word.toLowerCase())||entry)};
    }
    data.entries=data.entries.map((entry)=>({...entry,generalMeaning:isJapaneseMeaning(entry.generalMeaning)?entry.generalMeaning:'意味を取得できませんでした'}));
    jsonResponse(response,200,data.entries);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
