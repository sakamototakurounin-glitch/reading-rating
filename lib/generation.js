function randomPart() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createLongGenerationContext() {
  return Object.freeze({
    sessionId: `long-session-${randomPart()}`,
    generationId: `long-generation-${randomPart()}`,
  });
}
