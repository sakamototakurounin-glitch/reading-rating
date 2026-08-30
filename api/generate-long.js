import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';

const schema = { type:'object', additionalProperties:false, required:['id','title','topic','passage','questions','vocabulary'], properties:{
  id:{type:'string'}, title:{type:'string'}, topic:{type:'string'}, passage:{type:'string'},
  questions:{type:'array',minItems:5,maxItems:5,items:{type:'object',additionalProperties:false,required:['prompt','choices','answer'],properties:{prompt:{type:'string'},choices:{type:'array',minItems:3,maxItems:3,items:{type:'string'}},answer:{type:'integer',minimum:0,maximum:2}}}},
  vocabulary:{type:'array',minItems:12,maxItems:20,items:{type:'object',additionalProperties:false,required:['word','translation'],properties:{word:{type:'string'},translation:{type:'string'}}}},
} };

function profile(difficulty) {
  const anchors = difficulty <= 2 ? 'Eiken Grade 2 / CEFR B1–B2' : difficulty <= 7 ? 'Eiken Pre-1 / CEFR B2–C1' : difficulty <= 12 ? 'Eiken Grade 1 / strong CEFR C1' : 'well beyond Eiken Grade 1 / CEFR C2-style intellectual prose';
  return `Difficulty ${difficulty}/17 (${anchors}). Increase difficulty through vocabulary precision and rarity, syntactic embedding, information density, abstraction, implicit logical relations, cross-paragraph synthesis, and inference—not obscure specialist facts or bad writing. Difficulty 17 must be substantially harder than 12 by roughly the same step that separates 7 from 12.`;
}

export default async function handler(request,response) {
  if (request.method !== 'POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const difficulty=Math.max(0,Math.min(17,Math.round(Number(parseRequest(request).difficulty)||0)));
    const data=await structuredCompletion({
      system:'You are an expert English reading-assessment author. Produce rigorous, fair, self-contained material. Return only the requested structured data.',
      user:`Create an original English passage of 800–1200 words. ${profile(difficulty)} The topic must be understandable without specialist knowledge. Internally draft 8 candidate questions, audit them for unique answers, passage-only support, non-overlap, paragraph coverage, level fit, and natural distractors, then return only the best 5. At low levels favor main idea, explicit detail, and simple paraphrase; at middle levels add purpose, relationships, and moderate inference; at high levels emphasize subtle inference, stance, logical implication, cross-paragraph synthesis, and nuance. Give exactly 3 choices. Also return a vocabulary map of 12–20 likely challenging lowercase English words to concise Japanese meanings.`,
      schema,
    });
    data.vocabulary=Object.fromEntries(data.vocabulary.map(({word,translation})=>[word.toLowerCase(),translation]));
    jsonResponse(response,200,data);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
