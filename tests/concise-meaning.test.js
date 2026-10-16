import test from 'node:test';
import assert from 'node:assert/strict';
import {isConciseJapaneseMeaning} from '../lib/vocabulary-meaning.js';
import {normalizeUnknownWord} from '../lib/history-format.js';
import handler from '../api/lookup-words.js';

test('short equivalents pass while explanatory and English definitions require correction',()=>{
  for(const value of ['光合成','拡大、倍率','維持する、持続させる','その後に'])assert.equal(isConciseJapaneseMeaning(value),true,value);
  for(const value of ['to continue something over time','物の大きさを実際より大きく見せること','光エネルギーを利用して有機物を作る過程','あ'.repeat(25)])assert.equal(isConciseJapaneseMeaning(value),false,value);
});
test('old history and copy normalization repair the two reported verbose meanings without losing examples',()=>{
  for(const [word,old,expected] of [['magnification','物の大きさを実際より大きく見せること','拡大、倍率'],['photosynthesis','光エネルギーを利用して有機物を作る過程','光合成']]){
    const exampleSentence=`The passage discusses ${word}.`;const entry={word,generalMeaning:old,exampleSentence};const result=normalizeUnknownWord(entry);
    assert.equal(result.generalMeaning,expected);assert.equal(result.exampleSentence,exampleSentence);assert.equal(entry.generalMeaning,old);
  }
});
test('API retries only verbose meanings and retains the original examples',async()=>{
  const previousFetch=globalThis.fetch,previousKey=process.env.OPENAI_API_KEY;const requests=[];process.env.OPENAI_API_KEY='test-only';
  const entries=[{word:'sustain',generalMeaning:'何かを長い時間にわたって続けさせること',contextMeaning:'維持する',partOfSpeech:'verb',exampleSentence:'They sustain the project.'},{word:'photosynthesis',generalMeaning:'光エネルギーを利用して有機物を作る過程',contextMeaning:'光合成',partOfSpeech:'noun',exampleSentence:'Plants rely on photosynthesis.'}];
  globalThis.fetch=async(_url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({output_text:JSON.stringify(requests.length===1?{entries}:{entries:[{word:'sustain',generalMeaning:'維持する、持続させる'}]})})};};
  const response={status(code){this.code=code;return this;},setHeader(){return this;},send(body){this.data=JSON.parse(body);}};
  try{await handler({method:'POST',body:{passage:'A passage about plants and growth.',words:['sustain','photosynthesis']}},response);
    assert.equal(response.code,200);assert.equal(requests.length,2);assert.match(requests[0].input,/NOT an explanation/);assert.match(requests[1].input,/Do not regenerate examples/);
    assert.deepEqual(Object.keys(requests[1].text.format.schema.properties.entries.items.properties),['word','generalMeaning']);
    assert.equal(response.data[0].generalMeaning,'維持する、持続させる');assert.equal(response.data[1].generalMeaning,'光合成');assert.equal(response.data[0].exampleSentence,entries[0].exampleSentence);
  }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;}
});
