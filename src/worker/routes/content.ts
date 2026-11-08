import { Hono } from 'hono';
import type { WorkerEnv } from '../types';
import { verifyAdmin } from '../middleware/auth';
import { isLocalDev, isSafeOrigin } from '../lib/security';
import { getSiteContent, saveSiteContent, validateSiteContent } from '../lib/db';
import { triggerContentRebuild } from '../lib/rebuild';
import { logError } from '../lib/log';
import type { SiteContent } from '../../content/default';

export const contentRouter = new Hono<WorkerEnv>();

contentRouter.get('/content', async (c) => {
  try {
    const { content, updatedAt } = await getSiteContent(c.env, isLocalDev(c));
    const etag = updatedAt ? `"${updatedAt}"` : null;

    if (etag && c.req.header('If-None-Match') === etag) {
      return c.body(null, 304, {
        ETag: etag,
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
      });
    }

    const headers: Record<string, string> = {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
    };
    if (etag) headers.ETag = etag;

    return c.json(content, 200, headers);
  } catch (error) {
    logError('content_read_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Content is temporarily unavailable' }, 503);
  }
});

/**
 * Authenticated content read used by the CMS. It bypasses the public edge
 * cache so an editor never opens a stale snapshot and overwrites newer content.
 */
contentRouter.get('/admin/content', verifyAdmin, async (c) => {
  try {
    const { content, updatedAt } = await getSiteContent(c.env, isLocalDev(c));
    c.header('Cache-Control', 'no-store');
    return c.json({ content, updatedAt });
  } catch (error) {
    logError('admin_content_read_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Content is temporarily unavailable' }, 503);
  }
});

contentRouter.put('/admin/content', verifyAdmin, async (c) => {
  if (!isSafeOrigin(c)) {
    return c.json({ error: 'Cross-origin request rejected' }, 403);
  }

  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Accept both the legacy raw SiteContent body and the CMS envelope
  // { content, updatedAt } used for optimistic concurrency.
  const isEnvelope =
    !!payload && typeof payload === 'object' && 'content' in (payload as Record<string, unknown>);
  const body = isEnvelope
    ? (payload as { content: unknown; updatedAt?: unknown })
    : { content: payload, updatedAt: undefined };

  let expectedUpdatedAt: string | null | undefined;
  if (body.updatedAt === null) {
    expectedUpdatedAt = null;
  } else if (body.updatedAt !== undefined) {
    if (
      typeof body.updatedAt !== 'string' ||
      Number.isNaN(Date.parse(body.updatedAt))
    ) {
      return c.json({ error: 'Invalid content revision' }, 400);
    }
    expectedUpdatedAt = body.updatedAt;
  }

  if (!validateSiteContent(body.content)) {
    return c.json({ error: 'Content is missing required fields or has invalid structure' }, 400);
  }

  const isLocal = isLocalDev(c);
  if (!c.env.DATABASE_URL && (!isLocal || c.env.DEV_AUTH_BYPASS !== 'true')) {
    return c.json({ error: 'Database is not configured' }, 503);
  }

  try {
    const result = await saveSiteContent(
      c.env,
      body.content as SiteContent,
      isLocal,
      expectedUpdatedAt
    );

    if (!result.ok) {
      return c.json(
        {
          error: 'Content was updated by another session. Reload the editor and try again.',
          conflict: true
        },
        409
      );
    }

    const rebuild = triggerContentRebuild(c.env, result.updatedAt);

    try {
      c.executionCtx.waitUntil(rebuild);
    } catch {
      await rebuild;
    }

    return c.json({ ok: true, updatedAt: result.updatedAt });
  } catch (error) {
    logError('content_save_failed', error, { requestId: c.get('requestId') });
    return c.json({ error: 'Could not save content' }, 500);
  }
});
