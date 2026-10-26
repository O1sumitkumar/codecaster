const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 3;

export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;
  const hits = new Map();

  return {
    allow(userId) {
      const key = String(userId || "anonymous").toLowerCase();
      const now = Date.now();
      const bucket = hits.get(key) ?? [];
      const recent = bucket.filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}
