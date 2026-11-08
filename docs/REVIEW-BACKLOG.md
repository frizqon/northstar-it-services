# Review Backlog

Work items derived from the senior code review. Keep this list current as items land.

## P1 — Security

- [x] Escape JSON-LD before `set:html` in `BaseLayout.astro`.
- [x] Make `isLocalDev()` fail closed; require `ENVIRONMENT === 'development'`.
- [ ] Add global login rate limiting (Cloudflare WAF rule or Rate Limiting binding / Durable Object). Blocked on a custom domain or binding configuration; see `docs/OPERATIONS.md` §4. The Worker keeps the per-isolate limiter as a fallback.

## P2 — Correctness & hardening

- [x] Optimistic concurrency for `PUT /api/admin/content` (`updatedAt` precondition, `409` on conflict).
- [x] Paginate admin contact messages (`limit`/`offset`, server-side stats).
- [x] Add authenticated `GET /api/admin/content` with `Cache-Control: no-store`.
- [x] Apply security headers before `next()` so error responses keep CSP/HSTS.
- [x] Encode `mailto:` recipient in `MessagesManager`.
- [x] Do not mark a message as replied when the backend update fails.
- [x] Add `object-src 'none'`, `worker-src 'self'`, and `manifest-src 'self'`. Keep `connect-src https:` because the CMS uploads directly to the configured S3-compatible endpoint.
- [x] Structured error logging without raw error objects.

## P3 — Quality

- [x] Bound content payload size/shape and validate `imageUrl` server-side.
- [x] Validate content read from the database before returning it.
- [x] Validate `/api/content` responses on the client before use.
- [x] Compare full origin (scheme + host + port) in `isSafeOrigin`.
- [x] Enforce `isSafeOrigin` on admin login and logout.
- [x] Restrict admin JWT verification to `HS256`.
- [x] Keyboard-accessible message rows and modal focus handling.
- [x] Remove the default `admin` username from the login form.
- [x] Time-aware admin greeting.
- [x] Count only successful contact submissions against the contact rate limit.
- [x] Add a Preact error boundary for landing and admin islands.
- [x] Set Playwright `reuseExistingServer: false` to avoid stale servers.
- [x] Document contact message retention.
- [x] Replace weak `.dev.vars.example` placeholders with generation hints.

## Deferred / owner decision

- [ ] Remove the legacy `admin_session` cookie after the migration window.
- [ ] Resize/compress uploaded images before publishing (or use Cloudflare Images).
- [ ] Cache `neon()` and `S3Client` instances per isolate.
- [ ] Verify the gitleaks download checksum in CI.
- [ ] Add a `LICENSE` file.
- [ ] Run E2E on Firefox and WebKit.
- [ ] Add a retention job for `contact_messages` (policy documented only).
