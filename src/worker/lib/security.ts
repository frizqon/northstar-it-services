import type { Context } from 'hono';
import type { WorkerEnv } from '../types';

export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_COOKIE_PROD = '__Host-admin_session';

/**
 * Production uses the __Host- cookie prefix so the browser only sends the
 * session to the exact origin over HTTPS, with Path=/ and no Domain attribute.
 */
export function getAdminSessionCookieName(c: Context<WorkerEnv>): string {
  return c.env.ENVIRONMENT === 'production' ? ADMIN_SESSION_COOKIE_PROD : ADMIN_SESSION_COOKIE;
}

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
 * Fails closed: only an explicit `ENVIRONMENT=development` binding enables
 * development behaviour. Hostnames and request headers are never trusted.
 */
export function isLocalDev(c: Context<WorkerEnv>): boolean {
  return c.env.ENVIRONMENT === 'development';
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
    // Compare the full origin (scheme, host, port) so an HTTP page on the same
    // host cannot issue state-changing requests to the HTTPS origin.
    return originUrl.origin === requestUrl.origin;
  } catch {
    return false;
  }
}
