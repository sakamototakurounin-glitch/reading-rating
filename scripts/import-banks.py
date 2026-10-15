"""Import approved archives verbatim; split Long by level without editing content."""
import hashlib
import json
import pathlib
import sys
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
quick_path, long_path = map(pathlib.Path, sys.argv[1:3])
with zipfile.ZipFile(quick_path) as z:
    name = next(n for n in z.namelist() if n.endswith('/question_bank.json') or n == 'question_bank.json')
    quick_bytes = z.read(name)
    quick = json.loads(quick_bytes)
with zipfile.ZipFile(long_path) as z:
    long_bytes = z.read('long-reading-240.json')
    long = json.loads(long_bytes)
assert len(quick['passages']) == 167
assert len(long['items']) == 240
ids = set()
for p in quick['passages']:
    assert p['id'] not in ids
    ids.add(p['id'])
    assert len(p['questions']) == 3
    for q in p['questions']:
        assert len(q['options']) == 4
        assert len({c['id'] for c in q['options']}) == 4
        assert sum(c['id'] == q['answer_id'] for c in q['options']) == 1
levels = [10, 10, 10, 20, 50, 50, 50, 20, 10, 10]
for p in long['items']:
    assert p['id'] not in ids
    ids.add(p['id'])
    assert len(p['questions']) == 5
    for q in p['questions']:
        assert len(q['choices']) == 4
        assert sum(c['score'] == 3 and c['id'] == q['correct_choice_id'] for c in q['choices']) == 1
        assert sum(c['score'] == 0 for c in q['choices']) == 3
out = root / 'data/banks'
(out / 'long').mkdir(parents=True, exist_ok=True)
(out / 'quick.json').write_bytes(quick_bytes)
for level, count in enumerate(levels):
    items = [p for p in long['items'] if p['level'] == level]
    assert len(items) == count
    (out / 'long' / f'level-{level}.json').write_text(json.dumps({'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
manifest = {'version': 'bank-v1', 'quickPassages': 167, 'quickQuestions': 501, 'longPassages': 240, 'longQuestions': 1200, 'levels': levels, 'sourceSha256': {'quickJson': hashlib.sha256(quick_bytes).hexdigest(), 'longJson': hashlib.sha256(long_bytes).hexdigest()}, 'contentRewritten': False}
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print(json.dumps(manifest, indent=2))
