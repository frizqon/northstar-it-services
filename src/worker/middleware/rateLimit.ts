import type { Context, MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../types';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number;
}

const loginAttempts = new Map<string, AttemptRecord>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const contactAttempts = new Map<string, { count: number; firstAttemptAt: number }>();
const MAX_CONTACT_ATTEMPTS = 5;
const CONTACT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

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
    if (now - current.firstAttemptAt > LOGIN_WINDOW_MS) {
      current.count = 1;
      current.firstAttemptAt = now;
      current.blockedUntil = 0;
    } else {
      current.count += 1;
    }

    if (current.count >= MAX_LOGIN_ATTEMPTS) {
      current.blockedUntil = now + LOGIN_BLOCK_DURATION_MS;
    }

    loginAttempts.set(ip, current);
  } else if (c.res.status === 200) {
    // Reset failed counter on successful login
    loginAttempts.delete(ip);
  }
};

/**
 * Middleware to protect public contact submission from spam/flooding.
 */
export const contactRateLimiter: MiddlewareHandler<WorkerEnv> = async (c, next) => {
  const ip = getClientIp(c);
  const now = Date.now();
  const record = contactAttempts.get(ip);

  if (record) {
    if (now - record.firstAttemptAt > CONTACT_WINDOW_MS) {
      // Window expired, start fresh
      contactAttempts.set(ip, { count: 1, firstAttemptAt: now });
    } else if (record.count >= MAX_CONTACT_ATTEMPTS) {
      const remainingSeconds = Math.ceil((record.firstAttemptAt + CONTACT_WINDOW_MS - now) / 1000);
      c.header('Retry-After', remainingSeconds.toString());
      return c.json(
        {
          error: 'Too many messages sent. Please wait a few minutes before submitting again.'
        },
        429
      );
    } else {
      record.count += 1;
    }
  } else {
    contactAttempts.set(ip, { count: 1, firstAttemptAt: now });
  }

  await next();
};
