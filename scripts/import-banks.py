"""Import approved content, upgrading legacy Long score metadata to four points."""
import hashlib
import json
import pathlib
import sys
import zipfile
from long_bank_format import normalize_long_bank, POINTS_PER_CORRECT

root = pathlib.Path(__file__).resolve().parents[1]
quick_path, long_path = map(pathlib.Path, sys.argv[1:3])
with zipfile.ZipFile(quick_path) as z:
    name = next(n for n in z.namelist() if n.endswith('/question_bank.json') or n == 'question_bank.json')
    quick_bytes = z.read(name)
    quick = json.loads(quick_bytes)
if long_path.suffix.lower() == '.json':
    long_bytes = long_path.read_bytes()
else:
    with zipfile.ZipFile(long_path) as z:
        name = next(n for n in ('merged_300.json', 'long-reading-240.json') if n in z.namelist())
        long_bytes = z.read(name)
long = normalize_long_bank(json.loads(long_bytes))
assert len(quick['passages']) == 167
long_count = len(long['items'])
assert long_count in (240, 300)
ids = set()
for p in quick['passages']:
    assert p['id'] not in ids
    ids.add(p['id'])
    assert len(p['questions']) == 3
    for q in p['questions']:
        assert len(q['options']) == 4
        assert len({c['id'] for c in q['options']}) == 4
        assert sum(c['id'] == q['answer_id'] for c in q['options']) == 1
levels = [10, 10, 40, 50, 50, 50, 50, 20, 10, 10] if long_count == 300 else [10, 10, 10, 20, 50, 50, 50, 20, 10, 10]
for p in long['items']:
    assert p['id'] not in ids
    ids.add(p['id'])
    assert len(p['questions']) == 5
    for q in p['questions']:
        assert len(q['choices']) == 4
        assert sum(c['score'] == POINTS_PER_CORRECT and c['id'] == q['correct_choice_id'] for c in q['choices']) == 1
        assert sum(c['score'] == 0 for c in q['choices']) == 3
for level, count in enumerate(levels):
    assert sum(p['level'] == level for p in long['items']) == count
out = root / 'data/banks'
(out / 'long').mkdir(parents=True, exist_ok=True)
(out / 'quick.json').write_bytes(quick_bytes)
for level, count in enumerate(levels):
    items = [p for p in long['items'] if p['level'] == level]
    assert len(items) == count
    (out / 'long' / f'level-{level}.json').write_text(json.dumps({'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
manifest = {'version': 'bank-v2-four-point', 'quickPassages': 167, 'quickQuestions': 501, 'longPassages': long_count, 'longQuestions': long_count * 5, 'levels': levels, 'sourceSha256': {'quickJson': hashlib.sha256(quick_bytes).hexdigest(), 'longJson': hashlib.sha256(long_bytes).hexdigest()}, 'contentRewritten': False, 'longScoring': {'version': 'long-30-v1', 'pointsPerQuestion': POINTS_PER_CORRECT, 'multipleChoiceMax': 20, 'summaryMax': 10, 'scoreMax': 30}}
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
print(json.dumps(manifest, indent=2))
