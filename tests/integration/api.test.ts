import { randomUUID } from 'node:crypto';
import { beforeEach, describe, it, expect } from 'vitest';
import app from '../../src/worker/index';
import type { WorkerEnv } from '../../src/worker/types';
import { DEFAULT_CONTENT } from '../../src/content/default';
import { resetInMemoryStore } from '../../src/worker/lib/db';

// Generate ephemeral credentials per test run. Never commit test secrets.
const TEST_ADMIN_USERNAME = 'admin';
const TEST_ADMIN_PASSWORD = randomUUID();
const TEST_ADMIN_JWT_SECRET = `${randomUUID()}${randomUUID()}`;

const mockEnv: WorkerEnv['Bindings'] = {
  ASSETS: { fetch: async () => new Response('Asset not found', { status: 404 }) },
  ENVIRONMENT: 'development',
  DEV_AUTH_BYPASS: 'true',
  ADMIN_USERNAME: TEST_ADMIN_USERNAME,
  ADMIN_PASSWORD: TEST_ADMIN_PASSWORD,
  ADMIN_JWT_SECRET: TEST_ADMIN_JWT_SECRET
};

beforeEach(() => {
  resetInMemoryStore();
});

describe('Worker Integration: Security Headers & Health', () => {
  it('should return security headers on all responses', async () => {
    const res = await app.request('/api/health', {}, mockEnv);
    expect(res.status).toBe(200);

    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.headers.get('Strict-Transport-Security')).toBeNull();
  });

  it('should enforce Strict-Transport-Security in production', async () => {
    const prodEnv = { ...mockEnv, ENVIRONMENT: 'production' as const };
    const res = await app.request('/api/health', {}, prodEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Strict-Transport-Security')).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
  });

  it('should attach a request ID header and echo a valid incoming request ID', async () => {
    const generated = await app.request('/api/health', {}, mockEnv);
    expect(generated.headers.get('X-Request-Id')).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);

    const incoming = 'support-ticket-12345';
    const echoed = await app.request(
      '/api/health',
      { headers: { 'X-Request-Id': incoming } },
      mockEnv
    );
    expect(echoed.headers.get('X-Request-Id')).toBe(incoming);
  });

  it('GET /api/health should return ok: true and environment info', async () => {
    const res = await app.request('/api/health', {}, mockEnv);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.environment).toBe('development');
  });

  it('GET /api/config should expose only the public Turnstile site key', async () => {
    const res = await app.request('/api/config', {}, mockEnv);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ turnstileSiteKey: null });

    const withKey = await app.request(
      '/api/config',
      {},
      { ...mockEnv, TURNSTILE_SITE_KEY: 'test-site-key' }
    );
    expect(await withKey.json()).toEqual({ turnstileSiteKey: 'test-site-key' });
  });

  it('GET /api/content should return content with short-lived cache header', async () => {
    const res = await app.request('/api/content', {}, mockEnv);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe(
      'public, max-age=60, stale-while-revalidate=300'
    );
    expect(data.brand).toBe('NORTHSTAR');
  });

  it('GET /api/unknown should return a JSON 404 instead of an HTML asset', async () => {
    const res = await app.request('/api/unknown', {}, mockEnv);
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});

describe('Worker Integration: Admin Authentication & Rate Limiting', () => {
  it('GET /api/admin/me should return 401 when no session cookie is provided', async () => {
    const res = await app.request('/api/admin/me', {}, mockEnv);
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/login should fail with 401 for incorrect password', async () => {
    const res = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.101'
        },
        body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
      },
      mockEnv
    );
    expect(res.status).toBe(401);
  });

  it('POST /api/admin/login should succeed and set admin_session cookie with correct credentials', async () => {
    const res = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.102'
        },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(res.headers.get('Set-Cookie')).toContain('admin_session=');
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=43200');
  });

  it('POST /api/admin/login should use a __Host- cookie and 12-hour session in production', async () => {
    const prodEnv: WorkerEnv['Bindings'] = {
      ...mockEnv,
      ENVIRONMENT: 'production'
    };
    const res = await app.request(
      'https://northstar.example/api/admin/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.103'
        },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      prodEnv
    );

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('Set-Cookie') || '';
    expect(setCookie).toContain('__Host-admin_session=');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('Max-Age=43200');
  });

  it('POST /api/admin/login should reject a cross-origin request', async () => {
    const res = await app.request(
      'https://northstar.example/api/admin/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.104',
          Origin: 'https://evil.example'
        },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );

    expect(res.status).toBe(403);
  });

  it('POST /api/admin/login should trigger 429 Too Many Requests after 5 consecutive failures', async () => {
    const ip = '192.168.1.99';

    for (let i = 0; i < 5; i++) {
      const res = await app.request(
        '/api/admin/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
          body: JSON.stringify({ username: 'admin', password: 'bad' })
        },
        mockEnv
      );
      expect(res.status).toBe(401);
    }

    // 6th attempt should be blocked with 429
    const blockedRes = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get('Retry-After')).toBeDefined();
    const blockedData = await blockedRes.json();
    expect(blockedData.error).toContain('Too many failed attempts');
  });
});

describe('Worker Integration: Content Mutation & DoS Protection', () => {
  it('PUT /api/admin/content should reject unauthenticated requests with 401', async () => {
    const res = await app.request(
      '/api/admin/content',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_CONTENT)
      },
      mockEnv
    );
    expect(res.status).toBe(401);
  });

  it('PUT /api/admin/content should succeed with valid session and origin', async () => {
    // 1. Login to obtain session cookie
    const loginRes = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.200'
        },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );
    const cookieHeader = loginRes.headers.get('Set-Cookie') || '';
    const sessionToken = cookieHeader.split(';')[0];

    // 2. Perform authenticated PUT
    const putRes = await app.request(
      'https://northstar.example/api/admin/content',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        },
        body: JSON.stringify(DEFAULT_CONTENT)
      },
      mockEnv
    );

    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.ok).toBe(true);

    // 3. Content now exposes an ETag and supports conditional requests
    const contentRes = await app.request('/api/content', {}, mockEnv);
    const etag = contentRes.headers.get('ETag');
    expect(etag).toBeTruthy();

    const notModifiedRes = await app.request(
      '/api/content',
      { headers: { 'If-None-Match': etag as string } },
      mockEnv
    );
    expect(notModifiedRes.status).toBe(304);
  });

  it('GET /api/admin/content should reject unauthenticated requests and use no-store', async () => {
    const unauthenticated = await app.request('/api/admin/content', {}, mockEnv);
    expect(unauthenticated.status).toBe(401);

    const loginRes = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.201'
        },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );
    const sessionToken = (loginRes.headers.get('Set-Cookie') || '').split(';')[0];

    const res = await app.request(
      'https://northstar.example/api/admin/content',
      { headers: { Cookie: sessionToken } },
      mockEnv
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const data = await res.json();
    expect(data.content.brand).toBe('NORTHSTAR');
    expect(data.updatedAt).toBeNull();
  });

  it('PUT /api/admin/content should return 409 for a stale revision', async () => {
    const loginRes = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.202'
        },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );
    const sessionToken = (loginRes.headers.get('Set-Cookie') || '').split(';')[0];

    const headers = {
      'Content-Type': 'application/json',
      Origin: 'https://northstar.example',
      Cookie: sessionToken
    };

    const firstSave = await app.request(
      'https://northstar.example/api/admin/content',
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: DEFAULT_CONTENT, updatedAt: null })
      },
      mockEnv
    );
    expect(firstSave.status).toBe(200);
    const firstData = await firstSave.json();
    expect(typeof firstData.updatedAt).toBe('string');

    const staleSave = await app.request(
      'https://northstar.example/api/admin/content',
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: DEFAULT_CONTENT, updatedAt: null })
      },
      mockEnv
    );
    expect(staleSave.status).toBe(409);
    expect((await staleSave.json()).conflict).toBe(true);

    const freshSave = await app.request(
      'https://northstar.example/api/admin/content',
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: DEFAULT_CONTENT, updatedAt: firstData.updatedAt })
      },
      mockEnv
    );
    expect(freshSave.status).toBe(200);
  });

  it('POST /api/* should reject payloads exceeding 1 MB with 413 Payload Too Large', async () => {
    const hugePayload = 'A'.repeat(1024 * 1024 + 100); // > 1 MB

    const res = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: hugePayload, password: 'password' })
      },
      mockEnv
    );

    expect(res.status).toBe(413);
  });
});

describe('Worker Integration: Media Upload Verification', () => {
  const validKey = 'projects/123e4567-e89b-42d3-a456-426614174000-photo.jpg';

  async function loginAsAdmin(ip: string): Promise<string> {
    const loginRes = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );

    const cookieHeader = loginRes.headers.get('Set-Cookie') || '';
    return cookieHeader.split(';')[0];
  }

  it('POST /api/admin/media/confirm should reject unauthenticated requests with 401', async () => {
    const res = await app.request(
      '/api/admin/media/confirm',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: validKey })
      },
      mockEnv
    );

    expect(res.status).toBe(401);
  });

  it('POST /api/admin/media/confirm should reject malformed keys with 400', async () => {
    const sessionToken = await loginAsAdmin('192.168.1.210');
    const res = await app.request(
      'https://northstar.example/api/admin/media/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        },
        body: JSON.stringify({ key: '../photo.jpg' })
      },
      mockEnv
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid media key' });
  });

  it('POST /api/admin/media/confirm should return 503 when storage is not configured', async () => {
    const sessionToken = await loginAsAdmin('192.168.1.211');
    const res = await app.request(
      'https://northstar.example/api/admin/media/confirm',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        },
        body: JSON.stringify({ key: validKey })
      },
      mockEnv
    );

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Object Storage is not configured' });
  });
});

describe('Worker Integration: Contact Messages Feature', () => {
  it('POST /api/contact should reject invalid submission with 400', async () => {
    const res = await app.request(
      '/api/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.0.1' },
        body: JSON.stringify({ name: 'A', email: 'invalid', message: '' })
      },
      mockEnv
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('POST /api/contact should require a Turnstile token when the secret is configured', async () => {
    const res = await app.request(
      '/api/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.0.3' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          message: 'Interested in cloud and security audit.'
        })
      },
      { ...mockEnv, TURNSTILE_SECRET_KEY: 'test-secret' }
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('security challenge');
  });

  it('POST /api/contact should accept valid submission and return 201', async () => {
    const res = await app.request(
      '/api/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.0.2' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          message: 'Interested in cloud and security audit.'
        })
      },
      mockEnv
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.id).toBeDefined();
  });

  it('POST /api/contact should trigger 429 when submitting too many messages from same IP', async () => {
    const spamIp = '10.0.0.99';

    for (let i = 0; i < 5; i++) {
      const res = await app.request(
        '/api/contact',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': spamIp },
          body: JSON.stringify({
            name: `User ${i}`,
            email: `user${i}@example.com`,
            message: 'Inquiry message content'
          })
        },
        mockEnv
      );
      expect(res.status).toBe(201);
    }

    // 6th submission should be rate-limited
    const rateLimitedRes = await app.request(
      '/api/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': spamIp },
        body: JSON.stringify({
          name: 'Blocked User',
          email: 'blocked@example.com',
          message: 'This should be blocked by rate limit'
        })
      },
      mockEnv
    );

    expect(rateLimitedRes.status).toBe(429);
    const data = await rateLimitedRes.json();
    expect(data.error).toContain('Too many messages sent');
  });

  it('POST /api/contact should not count invalid submissions against the rate limit', async () => {
    const ip = '10.0.0.60';

    for (let i = 0; i < 6; i++) {
      const invalid = await app.request(
        '/api/contact',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
          body: JSON.stringify({ name: 'A', email: 'invalid', message: '' })
        },
        mockEnv
      );
      expect(invalid.status).toBe(400);
    }

    const valid = await app.request(
      '/api/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
        body: JSON.stringify({
          name: 'Valid User',
          email: 'valid@example.com',
          message: 'This valid submission should not be blocked.'
        })
      },
      mockEnv
    );
    expect(valid.status).toBe(201);
  });

  it('GET /api/admin/messages should paginate with limit and offset', async () => {
    const submitIp = '10.0.0.50';
    for (let i = 0; i < 3; i++) {
      const res = await app.request(
        '/api/contact',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': submitIp },
          body: JSON.stringify({
            name: `Paged User ${i}`,
            email: `paged${i}@example.com`,
            message: 'Pagination test message'
          })
        },
        mockEnv
      );
      expect(res.status).toBe(201);
    }

    const loginRes = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.168.1.206' },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );
    const sessionToken = (loginRes.headers.get('Set-Cookie') || '').split(';')[0];

    const firstPage = await app.request(
      'https://northstar.example/api/admin/messages?limit=1&offset=0',
      { headers: { Cookie: sessionToken } },
      mockEnv
    );
    expect(firstPage.status).toBe(200);
    const firstData = await firstPage.json();
    expect(firstData.messages).toHaveLength(1);
    expect(firstData.pagination).toMatchObject({ limit: 1, offset: 0, total: 3, hasMore: true });
    expect(firstData.stats.total).toBe(3);

    const lastPage = await app.request(
      'https://northstar.example/api/admin/messages?limit=1&offset=2',
      { headers: { Cookie: sessionToken } },
      mockEnv
    );
    const lastData = await lastPage.json();
    expect(lastData.messages).toHaveLength(1);
    expect(lastData.pagination.hasMore).toBe(false);
  });

  it('GET /api/admin/messages should reject unauthenticated requests with 401', async () => {
    const res = await app.request('/api/admin/messages', {}, mockEnv);
    expect(res.status).toBe(401);
  });

  it('GET, PUT, and DELETE /api/admin/messages should work for authenticated admin', async () => {
    // 1. Login to obtain session
    const loginRes = await app.request(
      '/api/admin/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.168.1.205' },
        body: JSON.stringify({ username: 'admin', password: TEST_ADMIN_PASSWORD })
      },
      mockEnv
    );
    const cookieHeader = loginRes.headers.get('Set-Cookie') || '';
    const sessionToken = cookieHeader.split(';')[0];

    // 2. Submit a fresh contact message
    const submitRes = await app.request(
      '/api/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.0.5' },
        body: JSON.stringify({
          name: 'Alice Smith',
          email: 'alice@example.com',
          message: 'Need consulting for our microservices setup.'
        })
      },
      mockEnv
    );
    const submitData = await submitRes.json();
    const messageId = submitData.id;

    // 3. Fetch messages as admin
    const listRes = await app.request(
      'https://northstar.example/api/admin/messages',
      {
        headers: { Cookie: sessionToken }
      },
      mockEnv
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.ok).toBe(true);
    expect(listData.messages).toBeInstanceOf(Array);
    expect(listData.stats).toBeDefined();
    expect(listData.stats.unread).toBeGreaterThanOrEqual(1);

    // 4. Update message status to 'read'
    const markReadRes = await app.request(
      `https://northstar.example/api/admin/messages/${messageId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        },
        body: JSON.stringify({ status: 'read' })
      },
      mockEnv
    );
    expect(markReadRes.status).toBe(200);
    const markReadData = await markReadRes.json();
    expect(markReadData.message.status).toBe('read');
    expect(markReadData.message.read_at).toBeDefined();
    expect(typeof markReadData.message.read_at).toBe('string');

    // 5. Update message status to 'replied' with reply notes
    const replyRes = await app.request(
      `https://northstar.example/api/admin/messages/${messageId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        },
        body: JSON.stringify({ status: 'replied', replyNotes: 'Proposal email sent.' })
      },
      mockEnv
    );
    expect(replyRes.status).toBe(200);
    const replyData = await replyRes.json();
    expect(replyData.message.status).toBe('replied');
    expect(replyData.message.reply_notes).toBe('Proposal email sent.');
    expect(replyData.message.replied_at).toBeDefined();

    // 6. Invalid reply notes and IDs are rejected
    const invalidReplyRes = await app.request(
      `https://northstar.example/api/admin/messages/${messageId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        },
        body: JSON.stringify({ status: 'replied', replyNotes: 123 })
      },
      mockEnv
    );
    expect(invalidReplyRes.status).toBe(400);

    const longReplyRes = await app.request(
      `https://northstar.example/api/admin/messages/${messageId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        },
        body: JSON.stringify({ status: 'replied', replyNotes: 'x'.repeat(2001) })
      },
      mockEnv
    );
    expect(longReplyRes.status).toBe(400);

    const invalidIdRes = await app.request(
      'https://northstar.example/api/admin/messages/abc',
      {
        method: 'DELETE',
        headers: {
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        }
      },
      mockEnv
    );
    expect(invalidIdRes.status).toBe(400);

    // 7. Delete message
    const deleteRes = await app.request(
      `https://northstar.example/api/admin/messages/${messageId}`,
      {
        method: 'DELETE',
        headers: {
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        }
      },
      mockEnv
    );
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.ok).toBe(true);

    // 8. Deleting the same message again must return 404
    const missingRes = await app.request(
      `https://northstar.example/api/admin/messages/${messageId}`,
      {
        method: 'DELETE',
        headers: {
          Origin: 'https://northstar.example',
          Cookie: sessionToken
        }
      },
      mockEnv
    );
    expect(missingRes.status).toBe(404);
  });
});
