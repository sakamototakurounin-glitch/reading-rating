const KEY = 'reading-rating-state-v1';
export const defaultState = Object.freeze({ internalRating: null, quickRating: null, longHistory: [], quickHistory: [], passageHistory: [] });
export function normalizeState(saved = {}) {
  const state = { ...defaultState, ...saved };
  // Existing users start Quick at their current Long Rating once; old histories stay intact.
  state.quickRating = Number.isFinite(state.quickRating) ? Math.max(0, state.quickRating)
    : Number.isFinite(state.internalRating) ? Math.max(0, state.internalRating) : null;
  return state;
}
export function loadState() {
  try { return normalizeState(JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { return normalizeState(); }
}
export function saveState(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
export function resetState() { localStorage.removeItem(KEY); localStorage.removeItem('reading-rating-state'); }
