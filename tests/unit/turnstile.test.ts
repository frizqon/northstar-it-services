import { describe, it, expect } from 'vitest';
import { verifyTurnstile } from '../../src/worker/lib/turnstile';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('Turnstile verification', () => {
  it('returns success when Cloudflare accepts the token', async () => {
    const result = await verifyTurnstile('secret', 'token', '203.0.113.10', async () =>
      jsonResponse({ success: true })
    );

    expect(result).toEqual({ success: true, errors: [] });
  });

  it('returns Cloudflare error codes when the token is rejected', async () => {
    const result = await verifyTurnstile('secret', 'bad-token', undefined, async () =>
      jsonResponse({ success: false, 'error-codes': ['invalid-input-response'] })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContain('invalid-input-response');
  });

  it('fails closed on HTTP errors', async () => {
    const result = await verifyTurnstile('secret', 'token', undefined, async () =>
      jsonResponse({}, 503)
    );

    expect(result).toEqual({ success: false, errors: ['http_503'] });
  });

  it('fails closed on network errors', async () => {
    const result = await verifyTurnstile('secret', 'token', undefined, async () => {
      throw new Error('network down');
    });

    expect(result).toEqual({ success: false, errors: ['verification_unavailable'] });
  });
});
