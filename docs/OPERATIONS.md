# Operations & External Hardening

This document covers controls that live outside the repository: Cloudflare dashboard rules, GitHub secrets, Worker secrets, and database recovery. Code-level hardening is documented in `README.md` and enforced by `npm run typecheck`, `npm run test`, and `npm run test:e2e`.

---

## 1. Required GitHub Actions secret

The deploy workflow runs migrations and bakes CMS content into the static build only when `DATABASE_URL` is configured.

```sh
gh secret set DATABASE_URL --repo rizqonfah/northstar-it-services
```

Paste the production Neon connection string when prompted. Never commit it, echo it, or paste it into an issue.

With this secret set:

- `npm run db:migrate` runs before deploy.
- `npm run build` fetches the current `site_content` row and writes CMS SEO metadata into the static HTML.

Without it, both steps fall back safely: migrations are skipped and the build uses `DEFAULT_CONTENT`.

---

## 2. Worker secrets

Set these with Wrangler. Each command prompts for the value.

```sh
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put GITHUB_DISPATCH_TOKEN
npx wrangler secret put GITHUB_REPO
```

`GITHUB_DISPATCH_TOKEN` must be a fine-grained GitHub token scoped to `rizqonfah/northstar-it-services` with `Contents: write`. `GITHUB_REPO` is `rizqonfah/northstar-it-services`.

The Worker triggers a `cms-content-updated` repository dispatch after each CMS save. The deploy workflow listens for that event and rebuilds the static site.

---

## 3. Turnstile

1. In the Cloudflare dashboard, open **Turnstile** and add a widget.
2. Add the production hostname. The current hostname is `northstar-it-services.frizqon.workers.dev`.
3. Copy the site key and secret key into the Worker secrets above.
4. Open the public site, submit the contact form, and confirm the challenge appears and the message is stored.
5. Remove the keys to disable the challenge without redeploying.

Turnstile does not require a custom domain. It works on `workers.dev`.

---

## 4. WAF rate limiting and Cloudflare Access

The current production hostname is `*.workers.dev`. Zone-level WAF rate limiting rules and Cloudflare Access policies require a custom domain attached to a Cloudflare zone you control. Add a custom domain to the Worker before configuring these controls.

Recommended WAF rate limiting rules once a custom domain is active:

| Rule | Expression | Threshold | Action |
| --- | --- | --- | --- |
| Contact form | `http.request.uri.path eq "/api/contact" and http.request.method eq "POST"` | 5 requests / 10 minutes per IP | Block |
| Admin login | `http.request.uri.path eq "/api/admin/login" and http.request.method eq "POST"` | 5 requests / 15 minutes per IP | Block |
| Admin API | `starts_with(http.request.uri.path, "/api/admin/")` | 60 requests / minute per IP | Managed Challenge |

The Worker also keeps an in-isolate limiter as a fallback. WAF rules provide global enforcement across isolates.

Recommended Cloudflare Access policy:

- Application: the custom domain paths `/admin/*` and `/api/admin/*`.
- Allow: your email address or identity provider group.
- Session duration: 12 hours or less.
- Require MFA at the identity provider.

Then set the Worker secrets used by the optional Access JWT check:

```sh
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler secret put CF_ACCESS_AUD
```

---

## 5. Secret rotation

1. Create the replacement credential in the provider dashboard.
2. Update the Worker secret with `npx wrangler secret put <KEY>`.
3. Update the GitHub Actions secret with `gh secret set <KEY> --repo rizqonfah/northstar-it-services`.
4. Deploy or rerun the deploy workflow.
5. Revoke the old credential after the new deployment is healthy.

Never rotate by committing values to the repository or printing them in logs.

---

## 6. Backups and restore tests

Neon provides point-in-time recovery on the project plan. In addition:

1. Create a manual logical backup from a trusted workstation:

   ```sh
   pg_dump "$DATABASE_URL" --format=custom --file=northstar-$(date +%Y%m%d).dump
   ```

2. Store the dump in encrypted storage with restricted access.
3. Restore into a temporary Neon branch, never directly into production.
4. Run `npm run db:status` against the restored branch and verify `site_content` plus recent `contact_messages` rows.
5. Delete the temporary branch after verification.

Test the restore path at least quarterly.

---

## 7. Observability and alerting

- Worker logs include a JSON `api_request` event with `requestId`, method, path, status, and duration.
- Unhandled errors include `requestId` and a safe client-facing error payload.
- Client reports can quote the `X-Request-Id` response header.
- Enable Cloudflare Workers Logs and alert on sustained 5xx responses, `unhandled_error` events, and `turnstile_failed` spikes.
- Alert on repeated `cms_rebuild_dispatch_failed` events so CMS saves do not silently stop rebuilding the static site.

---

## 8. PR checks and CI notifications

The CI workflow runs `typecheck`, unit and integration tests, build, and Playwright E2E for every pull request targeting `main` or `dev`. The required check name is:

```text
Typecheck, Test, Build & E2E
```

For pull requests targeting `main`, CI sends a Telegram message on completion:

- `CI PASSED` or `CI FAILED`
- PR number and title
- Actor
- Short commit SHA
- Links to the workflow run and pull request

Notification uses the existing `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` repository secrets. If either secret is missing, the notification step logs a skip message and does not fail CI.

### Required status check limitation

This repository is private on the GitHub Free plan. GitHub branch protection and repository rulesets return HTTP 403 on this plan, so the merge button cannot be hard-blocked by a required status check yet. To enforce merge blocking:

1. Upgrade the repository owner to GitHub Pro, or make the repository public.
2. Open **Settings → Branches → Add branch protection rule** for `main`.
3. Enable **Require status checks to pass before merging**.
4. Select **`Typecheck, Test, Build & E2E`**.
5. Enable **Require branches to be up to date before merging**.

Until then, the deploy workflow is the final gate: it reruns `typecheck`, `test`, and `build` on `main` before deploying. A failing test prevents deployment and sends a deploy failure notification.
