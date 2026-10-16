// Human-authored static translations only. Never call a translation/generation API.
const translations = new Map();
export function loadLongTranslation(id, fetcher = globalThis.fetch) {
  if (!/^L[0-9]-\d{3}$/.test(id)) return Promise.reject(new Error('和訳の教材IDが不正です'));
  if (!translations.has(id)) {
    translations.set(id, (async () => {
      const response = await fetcher(`/data/translations/long/${id}.json`);
      if (!response.ok) throw new Error('全文和訳を読み込めませんでした。和訳ボタンを押して再試行してください。');
      const data = await response.json();
      if (data.id !== id || !Array.isArray(data.paragraphs) || !data.paragraphs.length ||
          data.paragraphs.some(p => !p.id || typeof p.text !== 'string' || !/[\u3040-\u30ff]/.test(p.text))) {
        throw new Error('全文和訳のデータを確認できませんでした');
      }
      return data.paragraphs.map(p => p.text).join('\n\n');
    })().catch(error => { translations.delete(id); throw error; }));
  }
  return translations.get(id);
}
