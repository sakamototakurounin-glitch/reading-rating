import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/generate-long.js';
import { longPassage } from '../data/fallback.js';
import { passageRecord } from '../lib/passage-history.js';
import { createLongGenerationContext } from '../lib/generation.js';

test('Long rejects repeated drafts, preserves request identities and exposes generation failures', async () => {
  const originalFetch=globalThis.fetch;
  const originalKey=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='test-key';
  const draft=()=>({...structuredClone(longPassage),vocabulary:[]});
  const invoke=async(body)=>{
    const result={headers:{}};
    const response={status(value){result.status=value;return this;},setHeader(key,value){result.headers[key]=value;return this;},send(value){result.data=JSON.parse(value);}};
    await handler({method:'POST',body},response); return result;
  };
  try {
    const results=[];
    for(let index=0;index<5;index++){
      const content=draft(); content.passage+=`\nUnique case outcome ${index}.`; content.title=`Case ${index}`;
      globalThis.fetch=async()=>({ok:true,json:async()=>({output_text:JSON.stringify(content)})});
      const identity=createLongGenerationContext(); const result=await invoke({...identity,difficulty:7});
      assert.equal(result.status,200);assert.equal(result.data.sessionId,identity.sessionId);assert.equal(result.data.generationId,identity.generationId);
      assert.match(result.headers['Cache-Control'],/no-store/);results.push(result.data.passage);
    }
    assert.equal(new Set(results).size,5);
    let calls=0;
    const repeated=draft();
    globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({output_text:JSON.stringify(repeated)})};};
    const rejected=await invoke({...createLongGenerationContext(),difficulty:7,recentPassages:[passageRecord(repeated,7)]});
    assert.equal(calls,3);assert.equal(rejected.status,503);assert.match(rejected.data.error,/similar/);assert.equal(rejected.data.passage,undefined);
    globalThis.fetch=async()=>({ok:false,status:503,json:async()=>({error:{message:'Service unavailable'}})});
    const failure=await invoke({...createLongGenerationContext(),difficulty:7});assert.equal(failure.status,503);assert.equal(failure.data.passage,undefined);
  } finally {
    globalThis.fetch=originalFetch;
    if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;
  }
});
