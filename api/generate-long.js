import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';

const schema = { type:'object', additionalProperties:false, required:['id','title','topic','passage','translation','sampleSummary','questions','vocabulary'], properties:{
  id:{type:'string'}, title:{type:'string'}, topic:{type:'string'}, passage:{type:'string'}, translation:{type:'string'}, sampleSummary:{type:'string'},
  questions:{type:'array',minItems:5,maxItems:5,items:{type:'object',additionalProperties:false,required:['prompt','choices','answer','explanation','evidence'],properties:{prompt:{type:'string'},choices:{type:'array',minItems:4,maxItems:4,items:{type:'string'}},answer:{type:'integer',minimum:0,maximum:3},explanation:{type:'string'},evidence:{type:'string'}}}},
  vocabulary:{type:'array',minItems:12,maxItems:20,items:{type:'object',additionalProperties:false,required:['word','contextMeaning','basicMeaning','partOfSpeech'],properties:{word:{type:'string'},contextMeaning:{type:'string'},basicMeaning:{type:'string'},partOfSpeech:{type:'string'}}}},
} };

function profile(difficulty) {
  const anchors = difficulty <= 2 ? 'Eiken Grade 2 / CEFR B1–B2' : difficulty <= 7 ? 'Eiken Pre-1 / CEFR B2–C1' : difficulty <= 12 ? 'Eiken Grade 1 / strong CEFR C1' : 'well beyond Eiken Grade 1 / CEFR C2-style intellectual prose';
  return `Difficulty ${difficulty}/17 (${anchors}). Preserve the intended level, but keep lexical rarity secondary to syntactic embedding, information density, abstraction, conceptual complexity, implicit logical relations, discourse structure, cross-paragraph synthesis, and inference. Difficulty 12 may use Eiken Grade 1 vocabulary naturally; 13–15 may go somewhat beyond it but favor words inferable from context; at 16–17, advanced vocabulary is allowed while the main challenge must remain logic, syntax, abstraction, and compressed information. Difficulty 17 must be substantially harder than 12 by roughly the same step that separates 7 from 12, without becoming a list of rare words.`;
}

export default async function handler(request,response) {
  if (request.method !== 'POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const difficulty=Math.max(0,Math.min(17,Math.round(Number(parseRequest(request).difficulty)||0)));
    const data=await structuredCompletion({
      system:'You are an expert English reading-assessment author. Produce rigorous, fair, self-contained material. Return only the requested structured data.',
      user:`Create an original English passage of 800–1200 words. ${profile(difficulty)} The topic must be understandable without specialist knowledge. Internally draft 8 candidate questions, audit them for unique answers, passage-only support, non-overlap, paragraph coverage, level fit, and natural distractors, then return only the best 5. At low levels favor main idea, explicit detail, and simple paraphrase; at middle levels add purpose, relationships, and moderate inference; at high levels emphasize subtle inference, stance, logical implication, cross-paragraph synthesis, and nuance. Give exactly 4 choices per question. Each option should be a meaningful clause or sentence, normally 12–32 English words and about two mobile lines. Make distractors plausible through partial truth, reversed causality, altered scope or strength, or wrongly combined paragraphs, but keep one unique answer. For every question, explanation must explain the correct reasoning and why all three distractors fail; evidence must quote or precisely identify the supporting logic. Return a natural complete Japanese translation of the passage and a model Japanese summary of about 200 Japanese characters covering the theme, major reasoning, contrasts, causality, and conclusion. Also return 12–20 likely challenging lowercase words; each needs a concrete Japanese contextMeaning, a concrete Japanese basicMeaning, and partOfSpeech. Never answer only that meaning depends on context.`,
      schema,
    });
    data.vocabulary=Object.fromEntries(data.vocabulary.map(({word,...details})=>[word.toLowerCase(),details]));
    jsonResponse(response,200,data);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
