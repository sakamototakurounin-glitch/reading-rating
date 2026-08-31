import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';
import { normalizeSummaryGrade } from '../lib/summary-scoring.js';

const halfScores=[0,.5,1];
const impressionScores=[0,.5,1,1.5,2,2.5,3,3.5,4,4.5,5];
const schema={type:'object',additionalProperties:false,required:['elements','elementScore','impressionScore','rawScore','feedback','goodPoints','missingPoints','improvements','modelSummary'],properties:{elements:{type:'array',minItems:6,maxItems:6,items:{type:'object',additionalProperties:false,required:['name','score','reason'],properties:{name:{type:'string'},score:{type:'number',enum:halfScores},reason:{type:'string'}}}},elementScore:{type:'number',minimum:0,maximum:6},impressionScore:{type:'number',enum:impressionScores},rawScore:{type:'number',minimum:0,maximum:11},feedback:{type:'string'},goodPoints:{type:'string'},missingPoints:{type:'string'},improvements:{type:'string'},modelSummary:{type:'string'}}};
export default async function handler(request,response) {
  if(request.method!=='POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const {passage,summary}=parseRequest(request);
    if(!passage||!summary) return jsonResponse(response,400,{error:'passage and summary are required'});
    const data=await structuredCompletion({system:'You grade Japanese summaries of English passages fairly and consistently. Define passage-specific criteria and return only structured data.',user:`First define exactly six passage-specific essential elements. Score each element 0, 0.5, or 1: 0 means absent or clearly wrong; 0.5 means partial, vague, or missing an important part; 1 means accurately included. Then assign an impressionScore from 0 to 5 in 0.5-point increments for how accurately the summary integrates the passage's thesis, logic, causality, contrasts, turns, and conclusion. A list of remembered details is not a good summary: reduce impressionScore substantially when information is merely enumerated without its logical relationships. Reverse or materially incorrect central causality must receive a major impression penalty even when related facts are mentioned. elementScore and rawScore are requested for transparency but will be recalculated by code. feedback, goodPoints, missingPoints, and improvements must be concise Japanese. modelSummary must be a natural exemplary Japanese summary of about 200 Japanese characters that integrates all six elements through the passage's actual causality, contrasts, and conclusion rather than listing them. It should represent an ideal raw 11-point summary, although the displayed user score is capped at 10. Do not reward copied English.\n\nPASSAGE:\n${String(passage).slice(0,14000)}\n\nSUMMARY:\n${String(summary).slice(0,2000)}`,schema});
    jsonResponse(response,200,normalizeSummaryGrade(data));
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
