import { jsonResponse, structuredCompletion } from './_openai.js';

const question = { type:'object', additionalProperties:false, required:['prompt','choices','answer'], properties:{ prompt:{type:'string'}, choices:{type:'array',minItems:3,maxItems:3,items:{type:'string'}}, answer:{type:'integer',minimum:0,maximum:2} } };
const schema = { type:'array', minItems:3, maxItems:3, items:{ type:'object', additionalProperties:false, required:['id','topic','passage','questions'], properties:{ id:{type:'string'}, topic:{type:'string'}, passage:{type:'string'}, questions:{type:'array',minItems:3,maxItems:3,items:question} } } };

export default async function handler(request,response) {
  if (request.method !== 'POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const data = await structuredCompletion({
      system:'You design high-quality English speed-reading practice. Return only valid structured data. Every answer must be uniquely supported by its passage.',
      user:'Create exactly 3 independent English passages of 190–220 words on distinct practical topics chosen from business, society, science, technology, education, and daily life. Use accessible but substantive English around CEFR B2. For each, create exactly 3 questions covering main idea, detail, and inference/paraphrase. Each question has exactly 3 natural options and one unambiguous answer. Do not reuse a question focus.',
      schema,
    });
    jsonResponse(response,200,data);
  } catch (error) { jsonResponse(response,503,{error:error.message}); }
}
