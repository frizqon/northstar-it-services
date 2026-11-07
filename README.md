# Northstar IT Services — Astro + Preact + Workers + Neon

English-language IT services landing page with a lightweight Preact CMS SPA.

## Stack
- Astro static site with server-rendered Preact islands
- Preact + Vite-powered Astro integration at `/admin/`
- Hono API routes on Cloudflare Workers
- Neon Postgres for CMS content
- Neon Object Storage for project images; uploads use short-lived signed POST forms
- Cloudflare Access JWT validation for CMS writes and upload URL generation

## Local preview

Requires **Node.js 24+** (Node.js 26 LTS is also suitable).

```sh
npm install
npm run dev
```

The local Worker runs in demo mode (without Neon credentials) and saves CMS changes in the running Worker isolate. Demo changes are temporary and reset when the Worker restarts. To test against Neon locally, copy `.dev.vars.example` to `.dev.vars` and fill in the values. `DEV_AUTH_BYPASS` is enabled **only** by the local `dev`/`preview` scripts. Never set it in production.

Open `/` for the landing page and `/admin/` for the CMS. Image uploads require the Neon storage credentials and bucket CORS settings described below.

## Connect Neon Postgres

1. Create a Neon project and run `schema.sql` against its database.
2. Add the pooled Postgres connection string as a Worker secret:

   ```sh
   npx wrangler secret put DATABASE_URL
   ```

The first CMS save inserts the singleton content row. If no database is configured in production, write requests return an error rather than pretending to persist data.

## Configure Neon Object Storage

Neon Object Storage is currently marked **Beta** in its documentation. Create a bucket with public read access because the images are displayed on the public site; writes remain private and are done using short-lived signed upload forms.

1. In Neon, enable Object Storage for the branch used by the site and create a bucket, e.g. `northstar-assets`, with access level `public_read`.
2. Create a branch-scoped credential with the `storage:write` scope. Keep the secret key private. Obtain the endpoint and region from Neon’s Object Storage settings (or `neon env pull`).
3. Configure bucket CORS to allow the production site origin and the local/preview origin used for testing. Allow `POST`, `GET`, and `HEAD` methods and the required headers (at minimum `Content-Type`; using `*` for allowed headers is simplest for this bucket).
4. Save the following Worker secrets. Each command prompts for its value:

   ```sh
   npx wrangler secret put AWS_ENDPOINT_URL_S3
   npx wrangler secret put AWS_REGION
   npx wrangler secret put AWS_ACCESS_KEY_ID
   npx wrangler secret put AWS_SECRET_ACCESS_KEY
   npx wrangler secret put OBJECT_STORAGE_BUCKET
   ```

The CMS accepts JPEG, PNG, WebP, and AVIF up to 8 MB. The Worker signs a size-limited form that expires after five minutes; the browser never receives storage credentials. The public image URL is saved into the project content when you click **Save changes**.

For local upload testing, put the same variables in `.dev.vars` (already excluded by `.gitignore`). Do not commit this file.

## Protect the CMS in production

1. Create a Cloudflare Access self-hosted application covering `/admin/*` and `/api/admin/*`; allow only the admin identity.
2. Save the Access issuer hostname and application audience as Worker secrets:

   ```sh
   npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
   npx wrangler secret put CF_ACCESS_AUD
   ```

   Set `CF_ACCESS_TEAM_DOMAIN` to the full Access issuer hostname (for example `northstar.cloudflareaccess.com`, without `https://`). The Worker validates the signed Access JWT before accepting content changes or creating upload signatures.
3. Never set `DEV_AUTH_BYPASS` in production.

## Build and deploy

```sh
npm run build
npm run deploy
```

Static assets are served through the Workers Assets binding; `/api/*` routes run through Hono. The public HTML is generated from the English defaults for a fast, indexable baseline and refreshes from `/api/content` in the browser. For CMS-edited text to appear in the initial HTML/SEO metadata, connect publish to a site rebuild or move public page rendering to cached Worker SSR.
