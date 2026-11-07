import type { Context, MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../types';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(c: Context<WorkerEnv>): string {
  const cfIp = c.req.header('cf-connecting-ip');
  if (cfIp) return cfIp;

  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown-ip';
}

/**
 * Middleware to protect sensitive endpoints from brute-force attacks.
 */
export const loginRateLimiter: MiddlewareHandler<WorkerEnv> = async (c, next) => {
  const ip = getClientIp(c);
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && record.blockedUntil > now) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    c.header('Retry-After', remainingSeconds.toString());
    return c.json(
      {
        error: `Too many failed attempts. Please try again in ${Math.ceil(remainingSeconds / 60)} minutes.`
      },
      429
    );
  }

  await next();

  // If the request was a login attempt that failed (HTTP 401)
  if (c.res.status === 401) {
    const current = loginAttempts.get(ip) || {
      count: 0,
      firstAttemptAt: now,
      blockedUntil: 0
    };

    // Reset window if expired
    if (now - current.firstAttemptAt > WINDOW_MS) {
      current.count = 1;
      current.firstAttemptAt = now;
      current.blockedUntil = 0;
    } else {
      current.count += 1;
    }

    if (current.count >= MAX_ATTEMPTS) {
      current.blockedUntil = now + BLOCK_DURATION_MS;
    }

    loginAttempts.set(ip, current);
  } else if (c.res.status === 200) {
    // Reset failed counter on successful login
    loginAttempts.delete(ip);
  }
};
