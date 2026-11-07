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
