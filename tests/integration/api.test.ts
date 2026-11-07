import { describe, it, expect } from 'vitest';
import app from '../../src/worker/index';
import type { WorkerEnv } from '../../src/worker/types';
import { DEFAULT_CONTENT } from '../../src/content/default';

const mockEnv: WorkerEnv['Bindings'] = {
  ASSETS: { fetch: async () => new Response('Asset not found', { status: 404 }) },
  ENVIRONMENT: 'development',
  DEV_AUTH_BYPASS: 'true',
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'REDACTED',
  ADMIN_JWT_SECRET: 'REDACTED'
};

describe('Worker Integration: Security Headers & Health', () => {
  it('should return security headers on all responses', async () => {
    const res = await app.request('/api/health', {}, mockEnv);
    expect(res.status).toBe(200);

    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  it('GET /api/health should return ok: true and environment info', async () => {
    const res = await app.request('/api/health', {}, mockEnv);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.environment).toBe('development');
  });

  it('GET /api/content should return content with no-store cache header', async () => {
    const res = await app.request('/api/content', {}, mockEnv);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(data.brand).toBe('NORTHSTAR');
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
        body: JSON.stringify({ username: 'admin', password: 'REDACTED' })
      },
      mockEnv
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(res.headers.get('Set-Cookie')).toContain('admin_session=');
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
        body: JSON.stringify({ username: 'admin', password: 'REDACTED' })
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
        body: JSON.stringify({ username: 'admin', password: 'REDACTED' })
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
        body: JSON.stringify({ username: 'admin', password: 'REDACTED' })
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

    // 6. Delete message
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
  });
});
