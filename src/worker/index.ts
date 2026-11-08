import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { WorkerEnv } from './types';
import { requestContext } from './middleware/requestContext';
import { securityHeaders } from './middleware/securityHeaders';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { contentRouter } from './routes/content';
import { mediaRouter } from './routes/media';
import { contactRouter } from './routes/contact';

const app = new Hono<WorkerEnv>();

// Request correlation ID for logs and support reports
app.use('*', requestContext);

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
  console.error(
    JSON.stringify({
      event: 'unhandled_error',
      requestId: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      error: err instanceof Error ? err.message : String(err)
    })
  );
  return c.json(
    {
      error: 'An internal server error occurred',
      requestId: c.get('requestId')
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

// Unknown API routes must return JSON; every other path falls back to static assets.
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
