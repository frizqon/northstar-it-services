import { Hono } from 'hono';
import type { WorkerEnv } from '../types';
import { verifyAdmin } from '../middleware/auth';
import { isLocalDev, isSafeOrigin } from '../lib/security';
import { getSiteContent, saveSiteContent, validateSiteContent } from '../lib/db';
import type { SiteContent } from '../../content/default';

export const contentRouter = new Hono<WorkerEnv>();

contentRouter.get('/content', async (c) => {
  try {
    const content = await getSiteContent(c.env, isLocalDev(c));
    return c.json(content, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    console.error('Read content failed', error);
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

  if (!validateSiteContent(payload)) {
    return c.json({ error: 'Content is missing required fields or has invalid structure' }, 400);
  }

  const isLocal = isLocalDev(c);
  if (!c.env.DATABASE_URL && (!isLocal || c.env.DEV_AUTH_BYPASS !== 'true')) {
    return c.json({ error: 'Database is not configured' }, 503);
  }

  try {
    await saveSiteContent(c.env, payload as SiteContent, isLocal);
    return c.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Save content failed', error);
    return c.json({ error: 'Could not save content' }, 500);
  }
});
