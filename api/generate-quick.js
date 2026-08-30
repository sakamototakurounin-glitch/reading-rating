import { jsonResponse, structuredCompletion } from './_openai.js';

const question = { type:'object', additionalProperties:false, required:['prompt','choices','answer','explanation','evidence'], properties:{ prompt:{type:'string'}, choices:{type:'array',minItems:4,maxItems:4,items:{type:'string'}}, answer:{type:'integer',minimum:0,maximum:3}, explanation:{type:'string'}, evidence:{type:'string'} } };
const passage = { type:'object', additionalProperties:false, required:['id','topic','passage','translation','questions'], properties:{ id:{type:'string'}, topic:{type:'string'}, passage:{type:'string'}, translation:{type:'string'}, questions:{type:'array',minItems:3,maxItems:3,items:question} } };
const schema = { type:'object', additionalProperties:false, required:['passages'], properties:{ passages:{type:'array',minItems:3,maxItems:3,items:passage} } };

export default async function handler(request,response) {
  if (request.method !== 'POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const data = await structuredCompletion({
      system:'You design high-quality English speed-reading practice. Return only valid structured data. Every answer must be uniquely supported by its passage. Quick difficulty should come from speed, paraphrase, information processing, and accuracy—not a concentration of rare vocabulary.',
      user:'Create exactly 3 independent English passages of 190–220 words on distinct practical topics chosen from business, society, science, technology, education, and daily life. Use accessible but substantive English around CEFR B2 with mostly familiar or context-readable vocabulary. For each, create exactly 3 questions covering main idea, detail, and inference/paraphrase. Each question must have exactly 4 natural options and one unambiguous answer. Make every option a meaningful clause or sentence, normally 12–30 English words and roughly two mobile lines; never use one-word options. Distractors should look locally plausible by partially matching the text, reversing causality, changing scope or strength, or joining facts incorrectly, while remaining clearly wrong. explanation must identify why the correct option follows and why each other option fails. evidence must quote or precisely identify the supporting passage logic. Also provide a natural complete Japanese translation of each passage. Do not reuse a question focus.',
      schema,
    });
    jsonResponse(response,200,data.passages);
  } catch (error) { jsonResponse(response,503,{error:error.message}); }
}
