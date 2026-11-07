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

  it('should fallback to checking loopback IP if ENVIRONMENT is unset', () => {
    const ctx = createMockContext({}, 'http://127.0.0.1:8787/api/test');
    expect(isLocalDev(ctx)).toBe(true);

    const ctxRemote = createMockContext({}, 'https://northstar-it-services.workers.dev/api/test');
    expect(isLocalDev(ctxRemote)).toBe(false);
  });
});

describe('Security Utility: isSafeOrigin', () => {
  function createOriginContext(origin?: string, reqUrl = 'https://northstar.example/api/admin/content') {
    return {
      req: {
        url: reqUrl,
        header: (name: string) => {
          if (name.toLowerCase() === 'origin') return origin;
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
});
