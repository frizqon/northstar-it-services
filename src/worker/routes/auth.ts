import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { SignJWT } from 'jose';
import type { WorkerEnv } from '../types';
import { checkAdminAuth } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimit';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_PROD,
  ADMIN_SESSION_TTL_SECONDS,
  getAdminSessionCookieName,
  isLocalDev,
  isSafeOrigin,
  timingSafeEqual
} from '../lib/security';

export const authRouter = new Hono<WorkerEnv>();

authRouter.get('/me', async (c) => {
  const auth = await checkAdminAuth(c);
  if (auth.authenticated) {
    return c.json({ authenticated: true, user: auth.user });
  }
  return c.json({ authenticated: false }, 401);
});

authRouter.post('/login', loginRateLimiter, async (c) => {
  if (!isSafeOrigin(c)) {
    return c.json({ error: 'Cross-origin request rejected' }, 403);
  }

  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const isLocal = isLocalDev(c);

  const expectedUser = c.env.ADMIN_USERNAME;
  const expectedPass = c.env.ADMIN_PASSWORD;
  const secretStr = c.env.ADMIN_JWT_SECRET;

  if (!expectedPass || !expectedUser || !secretStr) {
    return c.json(
      {
        error: isLocal
          ? 'Admin credentials are not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_JWT_SECRET in .dev.vars.'
          : 'Admin authentication is not configured in production. Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_JWT_SECRET in Cloudflare Worker secrets.'
      },
      503
    );
  }

  const inputUser = body.username ?? '';
  const inputPass = body.password ?? '';

  const isUserValid = timingSafeEqual(inputUser, expectedUser);
  const isPassValid = timingSafeEqual(inputPass, expectedPass);

  if (!isUserValid || !isPassValid) {
    return c.json({ error: 'Invalid username or password' }, 401);
  }

  const jwtSecret = new TextEncoder().encode(secretStr);
  const token = await new SignJWT({ user: expectedUser, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_TTL_SECONDS}s`)
    .sign(jwtSecret);

  const isHttps = c.req.url.startsWith('https://') || c.req.header('x-forwarded-proto') === 'https';
  const isSecure = isHttps || c.env.ENVIRONMENT === 'production';
  setCookie(c, getAdminSessionCookieName(c), token, {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax',
    maxAge: ADMIN_SESSION_TTL_SECONDS
  });

  return c.json({ ok: true, user: { username: expectedUser } });
});

authRouter.post('/logout', (c) => {
  if (!isSafeOrigin(c)) {
    return c.json({ error: 'Cross-origin request rejected' }, 403);
  }

  // Delete both names so sessions survive the migration to __Host- cookies.
  const isSecure = c.env.ENVIRONMENT === 'production';
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Lax' as const
  };
  deleteCookie(c, ADMIN_SESSION_COOKIE_PROD, cookieOptions);
  deleteCookie(c, ADMIN_SESSION_COOKIE, cookieOptions);
  return c.json({ ok: true });
});
