// Rating推移のデータ作り。履歴の保存形式は変えず、読み取るだけ。
const valid = (r) => r && Number.isFinite(r.displayRatingBefore) && Number.isFinite(r.displayRatingAfter) && Number.isFinite(Date.parse(r.date));

// 各モードの点列（古い順）。先頭に「最初のセッション前のRating」を置く。
export function modeSeries(history = []) {
  const records = history.filter(valid).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (!records.length) return [];
  const first = records[0];
  return [{ t: Date.parse(first.date), rating: first.displayRatingBefore, start: true },
    ...records.map((r) => ({ t: Date.parse(r.date), rating: r.displayRatingAfter }))];
}

export function buildTrend(quickHistory, longHistory) {
  const series = { quick: modeSeries(quickHistory), long: modeSeries(longHistory) };
  const all = [...series.quick, ...series.long];
  if (!all.length) return { empty: true, series };
  const ratings = all.map((p) => p.rating), times = all.map((p) => p.t);
  let lo = Math.max(0, Math.floor((Math.min(...ratings) - 5) / 10) * 10);
  let hi = Math.min(100, Math.ceil((Math.max(...ratings) + 5) / 10) * 10);
  if (hi - lo < 20) { hi = Math.min(100, lo + 20); lo = Math.max(0, hi - 20); }
  return { empty: false, series, tMin: Math.min(...times), tMax: Math.max(...times), yMin: lo, yMax: hi };
}
