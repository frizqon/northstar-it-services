import type { Context } from 'hono';
import type { WorkerEnv } from '../types';

/**
 * Constant-time string comparison to defend against side-channel timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);

  if (aBuf.byteLength !== bBuf.byteLength) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    mismatch |= aBuf[i] ^ bBuf[i];
  }

  return mismatch === 0;
}

/**
 * Determines whether the current request is running in local development.
 * Never trusts request hostname if ENVIRONMENT is set to 'production'.
 */
export function isLocalDev(c: Context<WorkerEnv>): boolean {
  if (c.env.ENVIRONMENT === 'production') {
    return false;
  }

  if (c.env.ENVIRONMENT === 'development') {
    return true;
  }

  try {
    const url = new URL(c.req.url);
    const hostname = url.hostname;
    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost');

    return isLoopback || c.env.DEV_AUTH_BYPASS === 'true';
  } catch {
    return false;
  }
}

/**
 * Validates whether the request origin matches the request host (CSRF protection for state-modifying calls).
 */
export function isSafeOrigin(c: Context<WorkerEnv>): boolean {
  const origin = c.req.header('Origin');
  if (!origin) {
    // Non-browser or same-origin direct request without Origin header (e.g. some internal GET/same-origin fetches)
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(c.req.url);
    return originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}
