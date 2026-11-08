import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { WorkerEnv, AuthResult } from '../types';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_PROD,
  getAdminSessionCookieName,
  isLocalDev
} from '../lib/security';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function readSessionToken(c: Context<WorkerEnv>): string | undefined {
  const primaryName = getAdminSessionCookieName(c);
  const primary = getCookie(c, primaryName);
  if (primary) return primary;

  // Accept the legacy cookie only during the transition to __Host- cookies.
  if (primaryName === ADMIN_SESSION_COOKIE_PROD) {
    return getCookie(c, ADMIN_SESSION_COOKIE);
  }

  return undefined;
}

export async function checkAdminAuth(c: Context<WorkerEnv>): Promise<AuthResult> {
  const env = c.env;
  const isLocal = isLocalDev(c);

  // 1. Session Cookie Check
  const sessionToken = readSessionToken(c);
  if (sessionToken) {
    const secretStr = env.ADMIN_JWT_SECRET;

    if (secretStr) {
      try {
        const secret = new TextEncoder().encode(secretStr);
        const { payload } = await jwtVerify(sessionToken, secret);
        const username = typeof payload.user === 'string' ? payload.user : 'admin';
        return { authenticated: true, user: { username } };
      } catch {
        // Invalid or expired token
      }
    }
  }

  // 2. Cloudflare Access JWT Check
  const cfToken = c.req.header('Cf-Access-Jwt-Assertion');
  if (cfToken && env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD) {
    try {
      const issuer = `https://${env.CF_ACCESS_TEAM_DOMAIN}`;
      let jwks = jwksCache.get(issuer);
      if (!jwks) {
        jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
        jwksCache.set(issuer, jwks);
      }
      const { payload } = await jwtVerify(cfToken, jwks, {
        issuer,
        audience: env.CF_ACCESS_AUD
      });
      const username = typeof payload.email === 'string' ? payload.email : 'admin';
      return { authenticated: true, user: { username } };
    } catch {
      // Invalid Cloudflare Access JWT
    }
  }

  // 3. Fallback DEV_AUTH_BYPASS strictly in local development
  if (isLocal && env.DEV_AUTH_BYPASS === 'true' && !env.ADMIN_PASSWORD) {
    return { authenticated: true, user: { username: 'dev-bypass' } };
  }

  return { authenticated: false };
}

export const verifyAdmin: MiddlewareHandler<WorkerEnv> = async (c, next) => {
  const auth = await checkAdminAuth(c);
  if (!auth.authenticated) {
    return c.json({ error: 'Admin authentication required' }, 401);
  }
  c.set('adminUser', auth.user?.username || 'admin');
  return next();
};
