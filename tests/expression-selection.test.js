import test from 'node:test';
import assert from 'node:assert/strict';
import {passageWordTokens,selectedWordRuns,expressionCandidates,vocabularyFromSelection,resolveSelectedVocabulary,validateExpressionGroups} from '../lib/expression-selection.js';
import handler from '../api/classify-expressions.js';
import {normalizeUnknownWords} from '../lib/history-format.js';

test('only consecutive selected occurrences in a sentence are candidates',()=>{
  const text='Take into account today. People work, solar panels help.\n\nTake action.';
  const tokens=passageWordTokens(text);assert.deepEqual(tokens.map(t=>t.word),['take','into','account','today','people','work','solar','panels','help','take','action']);
  assert.deepEqual(selectedWordRuns(text,[0,1,2,3,4,5,6,7,8,9,10]).map(r=>r.map(t=>t.word)),[['take','into','account','today'],['people','work'],['solar','panels','help'],['take','action']]);
  assert.equal(expressionCandidates(text,[0,2,6]).length,0);
  assert.deepEqual(vocabularyFromSelection(text,[9,10]),['take','action']);
  const repeated='take into account. take time';assert.deepEqual(vocabularyFromSelection(repeated,[0,1,2,3],[{runIndex:0,start:0,end:2}]),['take into account','take']);
});
test('partial idioms, compounds, ordinary neighbors and lone words all survive',()=>{
  const text='We take into account today. People work near solar panels. Alone.';
  const selected=[1,2,3,4,5,6,8,9,10];
  assert.deepEqual(vocabularyFromSelection(text,selected,[{runIndex:0,start:0,end:2},{runIndex:2,start:0,end:1}]),['take into account','today','people','work','solar panels','alone']);
  const entries=normalizeUnknownWords([{word:'take into account',generalMeaning:'考慮する',exampleSentence:'We take costs into account.'}]);assert.equal(entries[0].word,'take into account');assert.equal(entries[0].generalMeaning,'考慮する');
});
test('sentence/paragraph boundaries, punctuation and unselected gaps cannot be bridged',()=>{
  for(const text of ['take. account','take, account','take; account','take\n\naccount','take (account)','take 2 account'])assert.equal(expressionCandidates(text,[0,1]).length,0,text);
  assert.equal(expressionCandidates('take\ninto account',[0,1,2]).length,1);
  assert.deepEqual(passageWordTokens("Don't re-enter John’s room").map(t=>t.word),["don't",'re-enter',"john's",'room']);
});
test('model spans must be in-range, at least two words, and nonoverlapping',()=>{
  const runs=expressionCandidates('take into account',[0,1,2]);
  for(const groups of [undefined,[{runIndex:1,start:0,end:1}],[{runIndex:0,start:0,end:3}],[{runIndex:0,start:1,end:1}],[{runIndex:0,start:0,end:1},{runIndex:0,start:1,end:2}]])assert.throws(()=>validateExpressionGroups(runs,groups));
});
test('no classification request for singles or gaps; failure retains selection for retry',async()=>{
  const noCall=()=>{throw Error('Must not call API');};
  assert.deepEqual(await resolveSelectedVocabulary('take into account',[0,2],noCall),['take','account']);
  let body;const fetcher=async(url,options)=>{assert.equal(url,'/api/classify-expressions');body=JSON.parse(options.body);return {ok:true,json:async()=>({groups:[{runIndex:0,start:0,end:2}]})};};
  const selection=[0,1,2];assert.deepEqual(await resolveSelectedVocabulary('take into account',selection,fetcher),['take into account']);assert.deepEqual(body.selectedTokenIndices,selection);
  await assert.rejects(resolveSelectedVocabulary('take into account',selection,async()=>({ok:false})));
  assert.deepEqual(selection,[0,1,2]);
});
const makeResponse=()=>({status(code){this.code=code;return this;},setHeader(){return this;},send(body){this.data=JSON.parse(body);}});
test('classification API skips isolated selections and validates input without AI',async()=>{
  const good=makeResponse();await handler({method:'POST',body:{passage:'take into account',selectedTokenIndices:[0,2]}},good);assert.equal(good.code,200);assert.deepEqual(good.data,{groups:[]});
  const bad=makeResponse();await handler({method:'POST',body:{passage:'a b',selectedTokenIndices:[2]}},bad);assert.equal(bad.code,400);
});
test('classification API returns conservative lexical spans and rejects malformed output',async()=>{
  const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';let request;
  try{
    globalThis.fetch=async(_url,options)=>{request=JSON.parse(options.body);return {ok:true,json:async()=>({output_text:JSON.stringify({groups:[{runIndex:0,start:0,end:2}]})})};};
    const good=makeResponse();await handler({method:'POST',body:{passage:'take into account today. people work',selectedTokenIndices:[0,1,2,3,4,5]}},good);assert.equal(good.code,200);assert.deepEqual(good.data.groups,[{runIndex:0,start:0,end:2}]);assert.match(request.input,/ordinary free combination/);
    globalThis.fetch=async()=>({ok:true,json:async()=>({output_text:JSON.stringify({groups:[{runIndex:0,start:0,end:50}]})})});
    const bad=makeResponse();await handler({method:'POST',body:{passage:'take action',selectedTokenIndices:[0,1]}},bad);assert.equal(bad.code,503);
  }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
});
