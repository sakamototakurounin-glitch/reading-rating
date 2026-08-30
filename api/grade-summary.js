import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';

const schema={type:'object',additionalProperties:false,required:['score','goodPoints','missingPoints','improvements','modelAnswer'],properties:{score:{type:'integer',minimum:0,maximum:10},goodPoints:{type:'string'},missingPoints:{type:'string'},improvements:{type:'string'},modelAnswer:{type:'string'}}};
export default async function handler(request,response) {
  if(request.method!=='POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const {passage,summary}=parseRequest(request);
    if(!passage||!summary) return jsonResponse(response,400,{error:'passage and summary are required'});
    const data=await structuredCompletion({system:'You grade Japanese summaries of English passages fairly and consistently. Return only structured data.',user:`Score the Japanese summary from 0 to 10. Content coverage 0–5, accuracy/no distortion 0–3, concision and organization 0–2. Do not reward copied English. In concise Japanese, separately state goodPoints, missingPoints, and actionable improvements. modelAnswer must be a natural, exemplary Japanese summary of about 200 Japanese characters—not a mechanical translation—and cover the central theme, major points, causality, necessary contrasts, and the author’s conclusion.\n\nPASSAGE:\n${String(passage).slice(0,14000)}\n\nSUMMARY:\n${String(summary).slice(0,2000)}`,schema});
    jsonResponse(response,200,data);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
