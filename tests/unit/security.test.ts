import { describe, it, expect } from 'vitest';
import { timingSafeEqual, isLocalDev, isSafeOrigin } from '../../src/worker/lib/security';
import type { Context } from 'hono';
import type { WorkerEnv } from '../../src/worker/types';

describe('Security Utility: timingSafeEqual', () => {
  it('should return true for identical strings', () => {
    expect(timingSafeEqual('admin', 'admin')).toBe(true);
    expect(timingSafeEqual('SecureP@ssw0rd123!', 'SecureP@ssw0rd123!')).toBe(true);
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('should return false for strings with different lengths', () => {
    expect(timingSafeEqual('admin', 'administrator')).toBe(false);
    expect(timingSafeEqual('secret', '')).toBe(false);
  });

  it('should return false for strings with same length but different characters', () => {
    expect(timingSafeEqual('admin1', 'admin2')).toBe(false);
    expect(timingSafeEqual('northstar', 'Northstar')).toBe(false);
  });
});

describe('Security Utility: isLocalDev', () => {
  function createMockContext(env: Partial<WorkerEnv['Bindings']>, url = 'https://example.com/api/test') {
    return {
      env: {
        ASSETS: { fetch: async () => new Response() },
        ...env
      },
      req: { url }
    } as unknown as Context<WorkerEnv>;
  }

  it('should never treat production as local dev even if hostname is localhost (Host Spoofing Defense)', () => {
    const ctx = createMockContext({ ENVIRONMENT: 'production' }, 'http://localhost/api/test');
    expect(isLocalDev(ctx)).toBe(false);

    const ctxLoopback = createMockContext({ ENVIRONMENT: 'production' }, 'http://127.0.0.1/api/test');
    expect(isLocalDev(ctxLoopback)).toBe(false);
  });

  it('should return true when ENVIRONMENT is development', () => {
    const ctx = createMockContext({ ENVIRONMENT: 'development' }, 'http://example.com/api/test');
    expect(isLocalDev(ctx)).toBe(true);
  });

  it('should fail closed when ENVIRONMENT is unset, even for loopback hosts', () => {
    const ctx = createMockContext({}, 'http://127.0.0.1:8787/api/test');
    expect(isLocalDev(ctx)).toBe(false);

    const ctxLocalhost = createMockContext({}, 'http://localhost/api/test');
    expect(isLocalDev(ctxLocalhost)).toBe(false);
  });

  it('should fail closed when only DEV_AUTH_BYPASS is set', () => {
    const ctx = createMockContext(
      { DEV_AUTH_BYPASS: 'true' },
      'https://northstar-it-services.workers.dev/api/test'
    );
    expect(isLocalDev(ctx)).toBe(false);
  });
});

describe('Security Utility: isSafeOrigin', () => {
  function createOriginContext(
    origin?: string,
    reqUrl = 'https://northstar.example/api/admin/content',
    secFetchSite?: string
  ) {
    return {
      req: {
        url: reqUrl,
        header: (name: string) => {
          const lower = name.toLowerCase();
          if (lower === 'origin') return origin;
          if (lower === 'sec-fetch-site') return secFetchSite;
          return undefined;
        }
      }
    } as unknown as Context<WorkerEnv>;
  }

  it('should allow requests without Origin header (same-origin / direct navigation)', () => {
    const ctx = createOriginContext(undefined);
    expect(isSafeOrigin(ctx)).toBe(true);
  });

  it('should allow requests where Origin host matches request host', () => {
    const ctx = createOriginContext('https://northstar.example');
    expect(isSafeOrigin(ctx)).toBe(true);
  });

  it('should reject requests where Origin host differs from request host (CSRF protection)', () => {
    const ctx = createOriginContext('https://malicious-attacker.com');
    expect(isSafeOrigin(ctx)).toBe(false);
  });

  it('should reject a different scheme on the same host', () => {
    const ctx = createOriginContext('http://northstar.example');
    expect(isSafeOrigin(ctx)).toBe(false);
  });

  it('should reject a different port on the same host', () => {
    const ctx = createOriginContext('https://northstar.example:8443');
    expect(isSafeOrigin(ctx)).toBe(false);
  });

  it('should reject requests with sec-fetch-site: cross-site even if origin is absent', () => {
    const ctx = createOriginContext(undefined, 'https://northstar.example/api/admin/content', 'cross-site');
    expect(isSafeOrigin(ctx)).toBe(false);
  });

  it('should allow requests with sec-fetch-site: same-origin', () => {
    const ctx = createOriginContext(undefined, 'https://northstar.example/api/admin/content', 'same-origin');
    expect(isSafeOrigin(ctx)).toBe(true);
  });
});
