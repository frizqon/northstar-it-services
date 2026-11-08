import type { WorkerEnv } from '../types';

type RebuildEnv = Pick<WorkerEnv['Bindings'], 'GITHUB_DISPATCH_TOKEN' | 'GITHUB_REPO'>;

/**
 * Asks GitHub Actions to rebuild and redeploy the static site after CMS content
 * changes, so build-time SEO metadata stays in sync with the database.
 */
export async function triggerContentRebuild(
  env: RebuildEnv,
  updatedAt: string,
  fetcher: typeof fetch = fetch
): Promise<void> {
  if (!env.GITHUB_DISPATCH_TOKEN || !env.GITHUB_REPO) {
    return;
  }

  try {
    const response = await fetcher(
      `https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'northstar-content-studio'
        },
        body: JSON.stringify({
          event_type: 'cms-content-updated',
          client_payload: { updatedAt }
        })
      }
    );

    if (!response.ok) {
      console.error(
        JSON.stringify({
          event: 'cms_rebuild_dispatch_failed',
          status: response.status
        })
      );
    }
  } catch {
    console.error(JSON.stringify({ event: 'cms_rebuild_dispatch_failed', status: 'network' }));
  }
}
