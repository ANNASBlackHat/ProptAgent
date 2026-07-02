interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitCache = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    const now = Date.now();
    rateLimitCache.forEach((record, key) => {
      // Keep only timestamps within the last 1 hour
      const filtered = record.timestamps.filter((ts) => now - ts < 60 * 60 * 1000);
      if (filtered.length === 0) {
        rateLimitCache.delete(key);
      } else {
        record.timestamps = filtered;
      }
    });
  }, 5 * 60 * 1000);
  // Prevent blocking process exit in scripts or builds
  if (interval && typeof interval.unref === 'function') {
    interval.unref();
  }
}

/**
 * Basic in-memory rate limiter.
 * @param ip - Client IP
 * @param limitKey - Unique key name for this limit (e.g. 'login', 'apply')
 * @param limitCount - Max allowed requests
 * @param windowMs - Time window in milliseconds
 * @returns boolean - true if allowed, false if rate limited
 */
export function rateLimit(
  ip: string,
  limitKey: string,
  limitCount: number,
  windowMs: number
): boolean {
  const key = `${limitKey}:${ip}`;
  const now = Date.now();

  let record = rateLimitCache.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitCache.set(key, record);
  }

  // Filter timestamps outside the window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limitCount) {
    return false;
  }

  record.timestamps.push(now);
  return true;
}
