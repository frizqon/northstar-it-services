import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { WorkerEnv } from './types';
import { securityHeaders } from './middleware/securityHeaders';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { contentRouter } from './routes/content';
import { mediaRouter } from './routes/media';
import { contactRouter } from './routes/contact';

const app = new Hono<WorkerEnv>();

// Global security headers
app.use('*', securityHeaders);

// Prevent Denial of Service via large payloads (1MB limit for JSON API calls)
app.use(
  '/api/*',
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => c.json({ error: 'Request body exceeds maximum size limit (1 MB)' }, 413)
  })
);

// Centralized error handling to prevent sensitive stack trace leaks in production
app.onError((err, c) => {
  console.error('Unhandled worker error:', err);
  return c.json(
    {
      error: 'An internal server error occurred'
    },
    500
  );
});

// Mount API routes
app.route('/api', healthRouter);
app.route('/api', contentRouter);
app.route('/api', contactRouter);
app.route('/api/admin', authRouter);
app.route('/api', mediaRouter);

// Cloudflare static assets fallback
app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
