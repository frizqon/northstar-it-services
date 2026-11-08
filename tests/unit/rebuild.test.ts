import { describe, it, expect, vi } from 'vitest';
import { triggerContentRebuild } from '../../src/worker/lib/rebuild';

describe('CMS rebuild dispatch', () => {
  it('does nothing when GitHub dispatch settings are missing', async () => {
    const fetcher = vi.fn<typeof fetch>();

    await triggerContentRebuild({}, '2026-11-08T00:00:00.000Z', fetcher);

    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts a repository_dispatch event when configured', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));

    await triggerContentRebuild(
      {
        GITHUB_DISPATCH_TOKEN: 'test-token',
        GITHUB_REPO: 'owner/repo'
      },
      '2026-11-08T00:00:00.000Z',
      fetcher
    );

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/owner/repo/dispatches');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      event_type: 'cms-content-updated',
      client_payload: { updatedAt: '2026-11-08T00:00:00.000Z' }
    });
  });
});
