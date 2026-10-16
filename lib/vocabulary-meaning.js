// Canonical short translations also repair these known verbose entries in old history.
const SHORT_MEANINGS = Object.freeze({magnification:'拡大、倍率',photosynthesis:'光合成'});
export const shortKnownMeaning=(word,meaning)=>SHORT_MEANINGS[String(word||'').trim().toLowerCase()]||String(meaning||'').trim();
export function isConciseJapaneseMeaning(value) {
  const text=String(value||'').trim();
  if(!/[\u3040-\u30ff\u3400-\u9fff]/.test(text)||[...text].length>24)return false;
  // Detect explanatory definitions, without clipping or guessing a replacement.
  return !(text.length>10&&/(?:こと|過程|仕組み|ためのもの|という意味|という性質)[。．.]?$/.test(text));
}
