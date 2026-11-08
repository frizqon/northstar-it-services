import { afterEach, describe, expect, it, vi } from 'vitest';
import { logError } from '../../src/worker/lib/log';

describe('Structured error logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should redact database URLs, passwords, and bearer tokens', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logError(
      'test_event',
      new Error(
        'failed postgres://user:pass@db.example/app password=hunter2 Bearer abc.def-123'
      ),
      { requestId: 'req-1' }
    );

    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.event).toBe('test_event');
    expect(payload.requestId).toBe('req-1');
    expect(payload.errorMessage).not.toContain('user:pass');
    expect(payload.errorMessage).not.toContain('hunter2');
    expect(payload.errorMessage).not.toContain('abc.def-123');
    expect(payload.errorMessage).toContain('[redacted-database-url]');
    expect(payload.errorMessage).toContain('password=[redacted]');
    expect(payload.errorMessage).toContain('Bearer [redacted]');
  });
});
