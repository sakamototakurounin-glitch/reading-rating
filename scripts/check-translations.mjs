import fs from 'node:fs';
import assert from 'node:assert/strict';
const missing=[], completed=[];
for(let level=0;level<10;level++){
  const bank=JSON.parse(fs.readFileSync(`data/banks/long/level-${level}.json`,'utf8')).items;
  for(const item of bank){
    const path=`data/translations/long/${item.id}.json`;
    if(!fs.existsSync(path)){missing.push(item.id);continue;}
    const translation=JSON.parse(fs.readFileSync(path,'utf8'));
    assert.equal(translation.id,item.id,`${path}: ID`);
    assert.ok(translation.title?.trim(),`${path}: title`);
    assert.deepEqual(translation.paragraphs.map(p=>p.id),item.passage.paragraphs.map(p=>p.id),`${path}: all paragraphs in original order`);
    for(const p of translation.paragraphs){
      const original=item.passage.paragraphs.find(source=>source.id===p.id);
      const minimumLength=Math.min(40,original.text.trim().split(/\s+/).length);
      assert.ok(typeof p.text==='string'&&/[\u3040-\u30ff]/.test(p.text)&&p.text.length>=minimumLength,`${path}: ${p.id} Japanese full paragraph`);
      assert.doesNotMatch(p.text,/未収録|翻訳予定|TODO|以下省略/,`${path}: no placeholders`);
    }
    completed.push(item.id);
  }
}
console.log(JSON.stringify({completed:completed.length,total:240,missing},null,2));
if(missing.length&&!process.argv.includes('--partial'))process.exitCode=1;
