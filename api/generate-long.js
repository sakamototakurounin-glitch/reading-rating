import { jsonResponse, parseRequest, structuredCompletion } from './_openai.js';
import { buildDifficultyProfile, difficultyPrompt } from '../lib/difficulty-profile.js';
import { isTooSimilar, passageRecord, recentHistoryForPrompt } from '../lib/passage-history.js';

const schema = { type:'object', additionalProperties:false, required:['id','title','topic','category','shortSummary','centralThesis','keywords','mainExamples','passage','translation','sampleSummary','questions','vocabulary'], properties:{
  id:{type:'string'}, title:{type:'string'}, topic:{type:'string'}, category:{type:'string'}, shortSummary:{type:'string'}, centralThesis:{type:'string'}, keywords:{type:'array',minItems:4,maxItems:10,items:{type:'string'}}, mainExamples:{type:'array',minItems:2,maxItems:6,items:{type:'string'}}, passage:{type:'string'}, translation:{type:'string'}, sampleSummary:{type:'string'},
  questions:{type:'array',minItems:5,maxItems:5,items:{type:'object',additionalProperties:false,required:['prompt','choices','answer','explanation','evidence'],properties:{prompt:{type:'string'},choices:{type:'array',minItems:4,maxItems:4,items:{type:'string'}},answer:{type:'integer',minimum:0,maximum:3},explanation:{type:'string'},evidence:{type:'string'}}}},
  vocabulary:{type:'array',minItems:12,maxItems:20,items:{type:'object',additionalProperties:false,required:['word','contextMeaning','basicMeaning','partOfSpeech'],properties:{word:{type:'string'},contextMeaning:{type:'string'},basicMeaning:{type:'string'},partOfSpeech:{type:'string'}}}},
} };

export default async function handler(request,response) {
  if (request.method !== 'POST') return jsonResponse(response,405,{error:'Method not allowed'});
  try {
    const input=parseRequest(request); const difficulty=Math.max(0,Math.min(17,Math.round(Number(input.difficulty)||0))); const profile=buildDifficultyProfile(difficulty); const recent=recentHistoryForPrompt(Array.isArray(input.recentPassages)?input.recentPassages:[]);
    const historyText=JSON.stringify(recent).slice(0,14000);
    const create=async(extra='')=>structuredCompletion({
      system:'You are an expert English reading-assessment author. Produce rigorous, fair, self-contained material. Return only the requested structured data.',
      user:`Create an original English passage of 800–1200 words. ${difficultyPrompt(profile)} The passage and its five questions must occupy the same calibrated level; at high levels, raise question difficulty through paraphrase, implication, inference, and synthesis rather than disproportionately harder option vocabulary. Choose from science, medicine, psychology, economics, history, philosophy, anthropology, linguistics, sociology, environment, biology, technology, education, culture, public policy, architecture, archaeology, or behavioral science, prioritizing a category not used in the most recent three records. Avoid semantic repetition of every recent record: compare domain, central thesis, argument structure, keywords, and main examples—not merely title or topic. The same broad category is acceptable only when the central question and examples are substantially different. RECENT PASSAGES: ${historyText}. Internally draft 8 candidate questions, audit them for unique answers, passage-only support, non-overlap, paragraph coverage, level fit, and natural distractors, then return only the best 5. Give exactly 4 choices per question. Each choice must be a complete, information-rich sentence of roughly 18–42 words (occasionally two sentences), normally 3–5 mobile lines. Keep all four choices close in length, syntax, specificity, and style; the correct choice must not be conspicuously longest. Make distractors plausible through partial truth, reversed causality, altered scope or strength, omitted conditions, or wrongly combined paragraphs, but keep one unique answer. For every question, explanation must explain the correct reasoning and why all three distractors fail; evidence must identify the supporting logic. Return title, topic, category, a shortSummary, centralThesis, 4–10 keywords, and 2–6 mainExamples for future semantic duplicate detection. Return a natural complete Japanese translation and a model Japanese summary of about 200 Japanese characters. Also return 12–20 likely challenging lowercase words with concrete contextMeaning, basicMeaning, and partOfSpeech. ${extra}`,
      schema,
    });
    let data=await create();
    if(isTooSimilar(passageRecord(data,difficulty),recent)) data=await create('The first draft was too similar to recent material. Change the domain or central thesis, argument structure, and main examples—not just the title.');
    data.vocabulary=Object.fromEntries(data.vocabulary.map(({word,...details})=>[word.toLowerCase(),details]));
    jsonResponse(response,200,data);
  } catch(error) { jsonResponse(response,503,{error:error.message}); }
}
