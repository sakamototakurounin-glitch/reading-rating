import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';
import { isTooSimilar, passageRecord, recentHistoryForPrompt } from '../lib/passage-history.js';

const question = { type:'object', additionalProperties:false, required:['prompt','choices','answer','explanation','evidence'], properties:{ prompt:{type:'string'}, choices:{type:'array',minItems:4,maxItems:4,items:{type:'string'}}, answer:{type:'integer',minimum:0,maximum:3}, explanation:{type:'string'}, evidence:{type:'string'} } };
const passage = { type:'object', additionalProperties:false, required:['id','title','topic','category','shortSummary','centralThesis','keywords','mainExamples','passage','translation','questions'], properties:{ id:{type:'string'}, title:{type:'string'}, topic:{type:'string'}, category:{type:'string'}, shortSummary:{type:'string'}, centralThesis:{type:'string'}, keywords:{type:'array',minItems:4,maxItems:10,items:{type:'string'}}, mainExamples:{type:'array',minItems:2,maxItems:6,items:{type:'string'}}, passage:{type:'string'}, translation:{type:'string'}, questions:{type:'array',minItems:3,maxItems:3,items:question} } };
const schema = { type:'object', additionalProperties:false, required:['passages'], properties:{ passages:{type:'array',minItems:3,maxItems:3,items:passage} } };

export default async function handler(request,response) {
  if (request.method !== 'POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const input=parseRequest(request); const recent=recentHistoryForPrompt(Array.isArray(input.recentPassages)?input.recentPassages:[]); const historyText=JSON.stringify(recent).slice(0,14000);
    const create=async(extra='')=>structuredCompletion({
      system:'You design high-quality English speed-reading practice. Return only valid structured data. Every answer must be uniquely supported by its passage. Quick difficulty should come from speed, paraphrase, information processing, and accuracy—not a concentration of rare vocabulary.',
      user:`Create exactly 3 independent English passages of 190–220 words in three different categories selected from science, medicine, psychology, economics, history, philosophy, anthropology, linguistics, sociology, environment, biology, technology, education, culture, public policy, architecture, archaeology, behavioral science, and daily life. Avoid categories used in the most recent three records when practical. Each new passage must differ semantically from every recent record in domain, central thesis, argument structure, keywords, and main examples—not merely title. The three new passages must also differ from one another. RECENT PASSAGES: ${historyText}. Use accessible but substantive English around CEFR B2 with familiar or context-readable vocabulary. For each, create exactly 3 questions covering main idea, detail, and inference/paraphrase. Each question must have exactly 4 complete, balanced options and one unambiguous answer. Each option should normally be 14–32 words, about 2–4 mobile lines, with similar length, syntax, specificity, and style; the correct option must not be conspicuously longest. Distractors should be plausible through partial truth, reversed causality, changed scope or strength, omitted conditions, or incorrectly joined facts. explanation must identify why the correct option follows and why each other option fails. evidence must identify the supporting passage logic. Provide title, topic, category, shortSummary, centralThesis, 4–10 keywords, and 2–6 mainExamples for future semantic duplicate detection, plus a natural complete Japanese translation. ${extra}`,
      schema,
    });
    let data=await create(); const accepted=[];
    const duplicate=data.passages.some((item)=>isTooSimilar(passageRecord(item,'quick'),[...recent,...accepted])?true:(accepted.push(passageRecord(item,'quick')),false));
    if(duplicate)data=await create('The first set was too similar to recent material or internally repetitive. Replace the overlapping domain, central thesis, argument structure, and examples.');
    jsonResponse(response,200,data.passages);
  } catch (error) { jsonResponse(response,503,{error:error.message}); }
}
