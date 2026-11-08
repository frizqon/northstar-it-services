import { Hono } from 'hono';
import type { WorkerEnv } from '../types';

export const configRouter = new Hono<WorkerEnv>();

configRouter.get('/config', (c) => {
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  return c.json({
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || null
  });
});
