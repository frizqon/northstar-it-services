import { Hono, type MiddlewareHandler, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { DEFAULT_CONTENT, type SiteContent } from '../content/default';

type Env = {
  Bindings: {
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    DATABASE_URL?: string;
    DEV_AUTH_BYPASS?: string;
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_JWT_SECRET?: string;
    CF_ACCESS_TEAM_DOMAIN?: string;
    CF_ACCESS_AUD?: string;
    AWS_ENDPOINT_URL_S3?: string;
    AWS_REGION?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    OBJECT_STORAGE_BUCKET?: string;
  };
};

const app = new Hono<Env>();
let demoContent: SiteContent = structuredClone(DEFAULT_CONTENT);
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function isLocalDev(c: Context<Env>): boolean {
  try {
    const url = new URL(c.req.url);
    const hostname = url.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      c.env.DEV_AUTH_BYPASS === 'true'
    );
  } catch {
    return false;
  }
}

async function getContent(env: Env['Bindings'], isLocal: boolean): Promise<SiteContent> {
  if (!env.DATABASE_URL) {
    if (isLocal && env.DEV_AUTH_BYPASS === 'true') return demoContent;
    throw new Error('DATABASE_URL is not configured');
  }
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`SELECT content FROM site_content WHERE id = 1 LIMIT 1`;
  return (rows[0]?.content as SiteContent | undefined) ?? DEFAULT_CONTENT;
}

async function checkAdminAuth(c: Context<Env>): Promise<{ authenticated: boolean; user?: { username: string } }> {
  const env = c.env;
  const isLocal = isLocalDev(c);

  // 1. Session Cookie Check
  const sessionToken = getCookie(c, 'admin_session');
  if (sessionToken) {
    // In production, ADMIN_JWT_SECRET must be explicitly set. In local dev, a fallback secret is permitted.
    const secretStr = env.ADMIN_JWT_SECRET || (isLocal ? 'REDACTED' : undefined);
    if (secretStr) {
      try {
        const secret = new TextEncoder().encode(secretStr);
        const { payload } = await jwtVerify(sessionToken, secret);
        return { authenticated: true, user: { username: (payload.user as string) || 'admin' } };
      } catch {}
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
      const { payload } = await jwtVerify(cfToken, jwks, { issuer, audience: env.CF_ACCESS_AUD });
      return { authenticated: true, user: { username: (payload.email as string) || 'admin' } };
    } catch {}
  }

  // 3. Fallback DEV_AUTH_BYPASS only in local development
  if (isLocal && env.DEV_AUTH_BYPASS === 'true' && !env.ADMIN_PASSWORD) {
    return { authenticated: true, user: { username: 'dev-bypass' } };
  }

  return { authenticated: false };
}

const verifyAdmin: MiddlewareHandler<Env> = async (c, next) => {
  const auth = await checkAdminAuth(c);
  if (!auth.authenticated) {
    return c.json({ error: 'Admin authentication required' }, 401);
  }
  return next();
};

app.get('/api/health', c => c.json({
  ok: true,
  mode: c.env.DATABASE_URL ? 'neon' : (isLocalDev(c) && c.env.DEV_AUTH_BYPASS === 'true') ? 'demo' : 'not-configured',
  environment: isLocalDev(c) ? 'development' : 'production'
}));

app.get('/api/content', async c => {
  try {
    return c.json(await getContent(c.env, isLocalDev(c)), 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('Read content failed', error);
    return c.json({ error: 'Content is temporarily unavailable' }, 503);
  }
});

// Admin Auth Endpoints
app.get('/api/admin/me', async c => {
  const auth = await checkAdminAuth(c);
  if (auth.authenticated) {
    return c.json({ authenticated: true, user: auth.user });
  }
  return c.json({ authenticated: false }, 401);
});

app.post('/api/admin/login', async c => {
  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const isLocal = isLocalDev(c);

  // In production, credentials MUST be explicitly configured in Cloudflare Worker secrets.
  // Default fallback credentials are ONLY available in local development.
  const expectedUser = c.env.ADMIN_USERNAME || (isLocal ? 'admin' : undefined);
  const expectedPass = c.env.ADMIN_PASSWORD || (isLocal ? 'REDACTED' : undefined);
  const secretStr = c.env.ADMIN_JWT_SECRET || (isLocal ? 'REDACTED' : undefined);

  if (!expectedPass || !expectedUser || !secretStr) {
    return c.json({
      error: isLocal
        ? 'Admin credentials are not configured.'
        : 'Admin authentication is not configured in production. Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_JWT_SECRET in Cloudflare Worker secrets.'
    }, 503);
  }

  if (!body.username || !body.password || body.username !== expectedUser || body.password !== expectedPass) {
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

app.post('/api/admin/logout', c => {
  deleteCookie(c, 'admin_session', { path: '/' });
  return c.json({ ok: true });
});

app.put('/api/admin/content', verifyAdmin, async c => {
  let payload: SiteContent;
  try {
    payload = await c.req.json<SiteContent>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!payload || typeof payload.brand !== 'string' || !payload.hero || !Array.isArray(payload.services) || !Array.isArray(payload.projects) || !payload.contact || !payload.seo) {
    return c.json({ error: 'Content is missing required fields' }, 400);
  }

  const isLocal = isLocalDev(c);
  if (!c.env.DATABASE_URL && (!isLocal || c.env.DEV_AUTH_BYPASS !== 'true')) {
    return c.json({ error: 'Database is not configured' }, 503);
  }

  try {
    if (!c.env.DATABASE_URL) {
      demoContent = payload;
    } else {
      const sql = neon(c.env.DATABASE_URL);
      await sql`INSERT INTO site_content (id, content, updated_at) VALUES (1, ${JSON.stringify(payload)}::jsonb, now()) ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`;
    }
    return c.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Save content failed', error);
    return c.json({ error: 'Could not save content' }, 500);
  }
});

const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

app.post('/api/admin/media/presign', verifyAdmin, async c => {
  const env = c.env;
  if (!env.AWS_ENDPOINT_URL_S3 || !env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.OBJECT_STORAGE_BUCKET) {
    return c.json({ error: 'Object Storage is not configured' }, 503);
  }

  let input: { fileName?: string; contentType?: string; size?: number };
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!input.fileName || !input.contentType || !Number.isInteger(input.size)) {
    return c.json({ error: 'File name, type, and size are required' }, 400);
  }

  if (!ALLOWED_MEDIA_TYPES.has(input.contentType)) {
    return c.json({ error: 'Only JPEG, PNG, WebP, and AVIF images are allowed' }, 415);
  }

  if ((input.size ?? 0) < 1 || (input.size ?? 0) > MAX_MEDIA_BYTES) {
    return c.json({ error: 'Image must be 8 MB or smaller' }, 413);
  }

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80) || 'image';
  const key = `projects/${crypto.randomUUID()}-${safeName}`;

  try {
    const s3 = new S3Client({
      endpoint: env.AWS_ENDPOINT_URL_S3,
      region: env.AWS_REGION,
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
    });

    const post = await createPresignedPost(s3, {
      Bucket: env.OBJECT_STORAGE_BUCKET,
      Key: key,
      Expires: 300,
      Fields: { 'Content-Type': input.contentType },
      Conditions: [['eq', '$Content-Type', input.contentType], ['content-length-range', 1, MAX_MEDIA_BYTES]]
    });

    const endpoint = env.AWS_ENDPOINT_URL_S3.replace(/\/$/, '');
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return c.json({
      uploadUrl: post.url,
      fields: post.fields,
      publicUrl: `${endpoint}/${encodeURIComponent(env.OBJECT_STORAGE_BUCKET)}/${encodedKey}`,
      key,
      maxBytes: MAX_MEDIA_BYTES
    });
  } catch (error) {
    console.error('Create upload URL failed', error);
    return c.json({ error: 'Could not prepare image upload' }, 502);
  }
});

app.all('*', async c => c.env.ASSETS.fetch(c.req.raw));

export default app;
