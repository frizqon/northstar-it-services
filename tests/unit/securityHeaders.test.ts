import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from '../../src/worker/middleware/securityHeaders';
import type { WorkerEnv } from '../../src/worker/types';

const env = {
  ASSETS: { fetch: async () => new Response('') },
  ENVIRONMENT: 'production'
} as WorkerEnv['Bindings'];

describe('Security headers middleware', () => {
  it('should add headers to a successful response', async () => {
    const app = new Hono<WorkerEnv>();
    app.use('*', securityHeaders);
    app.get('/ok', (c) => c.json({ ok: true }));

    const res = await app.request('/ok', {}, env);
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Content-Security-Policy')).toContain("object-src 'none'");
  });

  it('should keep headers on an unhandled error response', async () => {
    const app = new Hono<WorkerEnv>();
    app.use('*', securityHeaders);
    app.get('/boom', () => {
      throw new Error('boom');
    });
    app.onError((_err, c) => c.json({ error: 'internal' }, 500));

    const res = await app.request('/boom', {}, env);
    expect(res.status).toBe(500);
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  });

  it('should add object-src and worker-src hardening', async () => {
    const app = new Hono<WorkerEnv>();
    app.use('*', securityHeaders);
    app.get('/ok', (c) => c.text('ok'));

    const res = await app.request('/ok', {}, env);
    const csp = res.headers.get('Content-Security-Policy') || '';
    expect(csp).toContain("connect-src 'self' https:");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("manifest-src 'self'");
  });
});
