import { Hono } from 'hono';
import type { WorkerEnv } from './types';
import { securityHeaders } from './middleware/securityHeaders';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { contentRouter } from './routes/content';
import { mediaRouter } from './routes/media';

const app = new Hono<WorkerEnv>();

// Global security headers
app.use('*', securityHeaders);

// Mount API routes
app.route('/api', healthRouter);
app.route('/api', contentRouter);
app.route('/api/admin', authRouter);
app.route('/api', mediaRouter);

// Cloudflare static assets fallback
app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
