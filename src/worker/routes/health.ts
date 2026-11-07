import { Hono } from 'hono';
import type { WorkerEnv } from '../types';
import { isLocalDev } from '../lib/security';

export const healthRouter = new Hono<WorkerEnv>();

healthRouter.get('/health', (c) => {
  const isLocal = isLocalDev(c);
  return c.json({
    ok: true,
    mode: c.env.DATABASE_URL
      ? 'neon'
      : isLocal && c.env.DEV_AUTH_BYPASS === 'true'
        ? 'demo'
        : 'not-configured',
    environment: isLocal ? 'development' : 'production'
  });
});
