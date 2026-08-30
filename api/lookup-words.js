import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';

const schema={type:'object',additionalProperties:false,required:['entries'],properties:{entries:{type:'array',minItems:1,maxItems:40,items:{type:'object',additionalProperties:false,required:['word','contextMeaning','basicMeaning','partOfSpeech','exampleSentence'],properties:{word:{type:'string'},contextMeaning:{type:'string'},basicMeaning:{type:'string'},partOfSpeech:{type:'string'},exampleSentence:{type:'string'}}}}}};

export default async function handler(request,response) {
  if(request.method!=='POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const {passage,words}=parseRequest(request);
    const requested=Array.isArray(words)?words.map(String).filter(Boolean).slice(0,40):[];
    if(!passage||!requested.length) return jsonResponse(response,400,{error:'passage and words are required'});
    const data=await structuredCompletion({
      system:'You provide concise, concrete English vocabulary help in Japanese. Return only structured data.',
      user:`For every requested word, give its specific Japanese meaning in this passage, concrete basic dictionary meaning(s) in Japanese, English part of speech, and one short natural English exampleSentence using the same sense. The example must be newly written and must not copy a sentence from the passage. Never answer only “文脈に依存” or another vague placeholder.\n\nWORDS: ${requested.join(', ')}\n\nPASSAGE:\n${String(passage).slice(0,14000)}`,
      schema,
    });
    jsonResponse(response,200,data.entries);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
