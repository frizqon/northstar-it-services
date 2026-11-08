import type { Context, MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../types';

function applySecurityHeaders(c: Context<WorkerEnv>): void {
  // Basic security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Enforce HTTPS in production via Strict-Transport-Security (HSTS)
  if (c.env?.ENVIRONMENT === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https: blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
    // Direct-to-object-storage uploads use a presigned URL, so connect-src
    // must allow the configured S3-compatible endpoint. Keep the scheme broad
    // rather than hard-coding a provider host.
    "connect-src 'self' https:",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  c.header('Content-Security-Policy', csp);
}

export const securityHeaders: MiddlewareHandler<WorkerEnv> = async (c, next) => {
  // Set headers before the handler runs so responses created by app.onError
  // (which bypasses code after `await next()`) still carry them.
  applySecurityHeaders(c);
  await next();
};
