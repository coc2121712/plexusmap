// Simple in-memory rate limiter for API routes
const hits = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits) {
      if (now > val.resetAt) hits.delete(key);
    }
  }, 5 * 60 * 1000);
}

/**
 * Check rate limit for a given key.
 * Returns { allowed: true } or { allowed: false, retryAfter } in seconds.
 */
export function rateLimit(
  key: string,
  { maxRequests = 30, windowMs = 60_000 } = {}
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true };
  }

  return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}
