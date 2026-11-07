import type { Context } from 'hono';
import type { WorkerEnv } from '../types';

/**
 * Constant-time string comparison to defend against side-channel timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);

  // Compare the full maximum length so differing lengths do not short-circuit early.
  const length = Math.max(aBuf.byteLength, bBuf.byteLength);
  let mismatch = aBuf.byteLength ^ bBuf.byteLength;

  for (let i = 0; i < length; i++) {
    mismatch |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0);
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
 * Also inspects the Sec-Fetch-Site metadata header for modern browser defense-in-depth.
 */
export function isSafeOrigin(c: Context<WorkerEnv>): boolean {
  const secFetchSite = c.req.header('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return false;
  }

  const origin = c.req.header('Origin');
  if (!origin) {
    // Non-browser or direct navigation without Origin header
    return secFetchSite ? secFetchSite === 'same-origin' || secFetchSite === 'none' : true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(c.req.url);
    return originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}
