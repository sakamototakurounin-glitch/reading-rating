import test from 'node:test';
import assert from 'node:assert/strict';
import {CONCISE_MEANING_FORMAT,isConciseJapaneseMeaning,needsConciseMeaning,repairConciseMeanings} from '../lib/vocabulary-meaning.js';
import {normalizeUnknownWord} from '../lib/history-format.js';
import handler from '../api/lookup-words.js';

test('short equivalents pass while explanatory and English definitions require correction',()=>{
  for(const value of ['光合成','拡大、倍率','維持する、持続させる','その後に'])assert.equal(isConciseJapaneseMeaning(value),true,value);
  for(const value of ['to continue something over time','物の大きさを実際より大きく見せること','光エネルギーを利用して有機物を作る過程','あ'.repeat(25)])assert.equal(isConciseJapaneseMeaning(value),false,value);
});
test('all legacy meanings are eligible for general repair, not special-cased by word',()=>{
  for(const [word,old,expected] of [['magnification','物の大きさを実際より大きく見せること','拡大、倍率'],['photosynthesis','光エネルギーを利用して有機物を作る過程','光合成']]){
    const exampleSentence=`The passage discusses ${word}.`;const entry={word,generalMeaning:old,exampleSentence};const result=normalizeUnknownWord(entry);
    assert.equal(result.generalMeaning,old);assert.equal(needsConciseMeaning(result),true);assert.equal(result.exampleSentence,exampleSentence);assert.equal(entry.generalMeaning,old);
  }
  assert.equal(needsConciseMeaning({word:'any-word',generalMeaning:'配分'}),true);
  assert.equal(needsConciseMeaning({word:'any-word',generalMeaning:'配分',meaningFormat:CONCISE_MEANING_FORMAT}),false);
});
test('API retries only verbose meanings and retains the original examples',async()=>{
  const previousFetch=globalThis.fetch,previousKey=process.env.OPENAI_API_KEY;const requests=[];process.env.OPENAI_API_KEY='test-only';
  const entries=[{word:'sustain',generalMeaning:'何かを長い時間にわたって続けさせること',contextMeaning:'維持する',partOfSpeech:'verb',exampleSentence:'They sustain the project.'},{word:'photosynthesis',generalMeaning:'光エネルギーを利用して有機物を作る過程',contextMeaning:'光合成',partOfSpeech:'noun',exampleSentence:'Plants rely on photosynthesis.'}];
  globalThis.fetch=async(_url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({output_text:JSON.stringify(requests.length===1?{entries}:{entries:[{word:'sustain',generalMeaning:'維持する、持続させる'},{word:'photosynthesis',generalMeaning:'光合成'}]})})};};
  const response={status(code){this.code=code;return this;},setHeader(){return this;},send(body){this.data=JSON.parse(body);}};
  try{await handler({method:'POST',body:{passage:'A passage about plants and growth.',words:['sustain','photosynthesis']}},response);
    assert.equal(response.code,200);assert.equal(requests.length,2);assert.match(requests[0].input,/NOT an explanation/);assert.match(requests[1].input,/Do not regenerate examples/);
    assert.deepEqual(Object.keys(requests[1].text.format.schema.properties.entries.items.properties),['word','generalMeaning']);
    assert.equal(response.data[0].generalMeaning,'維持する、持続させる');assert.equal(response.data[1].generalMeaning,'光合成');assert.equal(response.data[0].exampleSentence,entries[0].exampleSentence);
  }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;}
});

test('legacy lists of any words migrate in batches, retain examples, and do not repeat after success',async()=>{
  const entries=Array.from({length:85},(_,i)=>({word:`arbitrary-${i}`,generalMeaning:'長い期間にわたって何かを維持し続けること',exampleSentence:`Original example ${i}.`,contextMeaning:'以前の文脈訳'}));
  const bodies=[];
  const fetcher=async(url,options)=>{assert.equal(url,'/api/lookup-words');const body=JSON.parse(options.body);bodies.push(body);assert.equal(body.meaningsOnly,true);assert.ok(body.words.length<=40);return {ok:true,json:async()=>body.words.map(word=>({word,generalMeaning:'維持する',meaningFormat:CONCISE_MEANING_FORMAT}))};};
  const migrated=await repairConciseMeanings(entries,'Original passage.',fetcher);
  assert.equal(bodies.length,3);assert.deepEqual(migrated.unresolved,[]);assert.equal(migrated.entries.length,85);
  for(let i=0;i<85;i++){assert.equal(migrated.entries[i].generalMeaning,'維持する');assert.equal(migrated.entries[i].exampleSentence,entries[i].exampleSentence);assert.equal(migrated.entries[i].contextMeaning,entries[i].contextMeaning);assert.notEqual(entries[i].generalMeaning,'維持する');}
  await repairConciseMeanings(migrated.entries,'Original passage.',async()=>{throw Error('No repeat lookup allowed');});
  assert.equal(bodies.length,3);
});
test('meaning-only API corrects arbitrary requested words without generating examples',async()=>{
  const previousFetch=globalThis.fetch,previousKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';let payload;
  globalThis.fetch=async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({output_text:JSON.stringify({entries:[{word:'allocation',generalMeaning:'配分'},{word:'resilience',generalMeaning:'回復力'},{word:'unrequested',generalMeaning:'不要'}]})})};};
  const response={status(code){this.code=code;return this;},setHeader(){return this;},send(body){this.data=JSON.parse(body);}};
  try{await handler({method:'POST',body:{words:['resilience','allocation'],meaningsOnly:true,entries:[{word:'resilience',generalMeaning:'困難な状況から元に戻ること'}]}},response);
    assert.equal(response.code,200);assert.deepEqual(Object.keys(payload.text.format.schema.properties.entries.items.properties),['word','generalMeaning']);
    assert.deepEqual(response.data,[{word:'resilience',generalMeaning:'回復力',meaningFormat:CONCISE_MEANING_FORMAT},{word:'allocation',generalMeaning:'配分',meaningFormat:CONCISE_MEANING_FORMAT}]);
  }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;}
});
test('failed legacy repair preserves old data for retry and rejects unrequested or verbose responses',async()=>{
  const entries=[{word:'resilience',generalMeaning:'困難な状況から再び元の状態へ戻ること',exampleSentence:'The system has resilience.'}];
  const failed=await repairConciseMeanings(entries,'',async()=>({ok:false}));assert.deepEqual(failed.entries,entries);assert.deepEqual(failed.unresolved,['resilience']);
  const bad=await repairConciseMeanings(entries,'',async()=>({ok:true,json:async()=>[{word:'different-word',generalMeaning:'回復力',meaningFormat:CONCISE_MEANING_FORMAT},{word:'resilience',generalMeaning:entries[0].generalMeaning,meaningFormat:CONCISE_MEANING_FORMAT}]}));assert.deepEqual(bad.unresolved,['resilience']);
  const good=await repairConciseMeanings(failed.entries,'',async()=>({ok:true,json:async()=>[{word:'resilience',generalMeaning:'回復力',meaningFormat:CONCISE_MEANING_FORMAT}]}));assert.deepEqual(good.unresolved,[]);assert.equal(good.entries[0].generalMeaning,'回復力');assert.equal(good.entries[0].exampleSentence,entries[0].exampleSentence);
});
