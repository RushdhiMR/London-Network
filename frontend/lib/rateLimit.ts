interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired entries every 2 minutes
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 120000);
  if (timer.unref) timer.unref();
}

/**
 * Checks if a given identifier exceeds rate limit.
 * @param identifier Unique key (e.g., IP address + action)
 * @param maxAttempts Maximum allowed requests in window
 * @param windowMs Time window in milliseconds (default: 15 minutes)
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(identifier);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetInMs: windowMs };
  }

  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, existing.resetAt - now)
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - existing.count,
    resetInMs: Math.max(0, existing.resetAt - now)
  };
}

/**
 * Extracts client IP from standard request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}
