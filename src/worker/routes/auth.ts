import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { SignJWT } from 'jose';
import type { WorkerEnv } from '../types';
import { checkAdminAuth } from '../middleware/auth';
import { isLocalDev, timingSafeEqual } from '../lib/security';

export const authRouter = new Hono<WorkerEnv>();

authRouter.get('/me', async (c) => {
  const auth = await checkAdminAuth(c);
  if (auth.authenticated) {
    return c.json({ authenticated: true, user: auth.user });
  }
  return c.json({ authenticated: false }, 401);
});

authRouter.post('/login', async (c) => {
  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const isLocal = isLocalDev(c);

  const expectedUser = c.env.ADMIN_USERNAME || (isLocal ? 'admin' : undefined);
  const expectedPass = c.env.ADMIN_PASSWORD || (isLocal ? 'REDACTED' : undefined);
  const secretStr =
    c.env.ADMIN_JWT_SECRET ||
    (isLocal ? 'REDACTED' : undefined);

  if (!expectedPass || !expectedUser || !secretStr) {
    return c.json(
      {
        error: isLocal
          ? 'Admin credentials are not configured.'
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
    .setExpirationTime('7d')
    .sign(jwtSecret);

  const isHttps = c.req.url.startsWith('https://');
  setCookie(c, 'admin_session', token, {
    path: '/',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'Lax',
    maxAge: 7 * 24 * 3600
  });

  return c.json({ ok: true, user: { username: expectedUser } });
});

authRouter.post('/logout', (c) => {
  deleteCookie(c, 'admin_session', { path: '/' });
  return c.json({ ok: true });
});
