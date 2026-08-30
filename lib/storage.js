const KEY = 'reading-rating-state-v1';
export const defaultState = Object.freeze({ internalRating: null, quickTimeLimit: 120, longHistory: [], quickHistory: [] });
export function loadState() {
  try { return { ...defaultState, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...defaultState }; }
}
export function saveState(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
export function resetState() { localStorage.removeItem(KEY); localStorage.removeItem('reading-rating-state'); }
