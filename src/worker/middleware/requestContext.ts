import type { Context, MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../types';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function resolveRequestId(c: Context<WorkerEnv>): string {
  const incoming = c.req.header('x-request-id');
  if (incoming && REQUEST_ID_PATTERN.test(incoming)) {
    return incoming;
  }

  const cfRay = c.req.header('cf-ray');
  if (cfRay && REQUEST_ID_PATTERN.test(cfRay)) {
    return cfRay;
  }

  return crypto.randomUUID();
}

/**
 * Adds a stable request ID to every request so Worker logs and client reports
 * can be correlated without exposing internal stack traces.
 */
export const requestContext: MiddlewareHandler<WorkerEnv> = async (c, next) => {
  const requestId = resolveRequestId(c);
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  const startedAt = Date.now();
  let status = 500;

  try {
    await next();
    status = c.res.status;
  } finally {
    if (c.req.path.startsWith('/api/')) {
      console.log(
        JSON.stringify({
          event: 'api_request',
          requestId,
          method: c.req.method,
          path: c.req.path,
          status,
          durationMs: Date.now() - startedAt
        })
      );
    }
  }
};
