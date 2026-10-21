import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrend, modeSeries } from '../lib/rating-trend.js';

const rec = (date, before, after) => ({ date, displayRatingBefore: before, displayRatingAfter: after });

test('modeSeries orders records oldest first and starts from the rating before the first session', () => {
  const s = modeSeries([rec('2026-10-03T00:00:00Z', 32, 35), rec('2026-10-01T00:00:00Z', 30, 32)]);
  assert.deepEqual(s.map((p) => p.rating), [30, 32, 35]);
  assert.equal(s[0].start, true);
});

test('modeSeries skips legacy records without rating fields', () => {
  assert.deepEqual(modeSeries([{ date: '2026-10-01T00:00:00Z' }, { displayRatingBefore: 1, displayRatingAfter: 2 }]), []);
});

test('buildTrend is empty without history and keeps both modes otherwise', () => {
  assert.equal(buildTrend([], []).empty, true);
  const t = buildTrend([rec('2026-10-01T00:00:00Z', 30, 33)], [rec('2026-10-02T00:00:00Z', 50, 48)]);
  assert.equal(t.empty, false);
  assert.equal(t.series.quick.length, 2);
  assert.equal(t.series.long.length, 2);
  assert.ok(t.yMin <= 30 && t.yMax >= 50 && t.yMax - t.yMin >= 20 && t.yMax <= 100 && t.yMin >= 0);
});

test('buildTrend never drops outside 0-100 and keeps a 20 point window near the edges', () => {
  const hi = buildTrend([rec('2026-10-01T00:00:00Z', 98, 100)], []);
  assert.equal(hi.yMax, 100); assert.ok(hi.yMin <= 80);
  const lo = buildTrend([], [rec('2026-10-01T00:00:00Z', 0, 2)]);
  assert.equal(lo.yMin, 0); assert.ok(lo.yMax >= 20);
});
