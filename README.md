# Northstar IT Services — Astro + Preact + Workers + Neon

Modern IT services landing page with an integrated Preact Content Studio (CMS), powered by Cloudflare Workers and Neon Serverless Postgres + Object Storage.

---

## Architecture & Stack

- **Frontend**: Astro static site with server-rendered Preact islands and accessible semantic markup.
- **CMS Studio**: Preact single-page application at `/admin/` with tabbed form editors.
- **Backend / API**: Hono framework running on Cloudflare Workers (`/api/*`).
- **Database**: Neon Serverless Postgres (`site_content` singleton JSONB schema).
- **Media Storage**: Neon Object Storage (S3-compatible) with browser-direct presigned POST forms.
- **Authentication**: Built-in signed JWT session cookies with constant-time comparison, brute-force rate limiting, and optional Cloudflare Access Zero Trust JWT validation.
- **Testing**: Vitest for unit & integration tests, Playwright for browser E2E tests.

---

## Project Structure

```text
├── .github/
│   ├── scripts/             # Deployment notification scripts (Email & Telegram)
│   └── workflows/           # GitHub Actions CI/CD (Typecheck -> Test -> Build -> Deploy)
├── public/                  # Static assets (robots.txt, favicon.svg)
├── src/
│   ├── components/
│   │   ├── admin/           # Content Studio CMS components (Login, Sidebar, Header, Editors)
│   │   ├── landing/         # Public landing page sections (Navbar, Hero, Services, Work, etc.)
│   │   ├── ui/              # Reusable UI primitives (InputField, StatCard, StatusDot, ToastNotice)
│   │   ├── AdminApp.tsx     # Admin workspace orchestrator
│   │   └── LandingPage.tsx  # Landing page orchestrator
│   ├── content/             # Default fallback site content and TypeScript types
│   ├── layouts/             # Reusable Astro layouts (BaseLayout with SEO & OpenGraph)
│   ├── pages/               # Astro file-based routes (/ and /admin/)
│   ├── styles/              # Global CSS, variables, and responsive layout styles
│   ├── utils/               # Sanitizers and URL validators
│   └── worker/
│       ├── lib/             # Database connection, S3 presigned client, and security helpers
│       ├── middleware/      # Auth, rate limiting, and HTTP security headers (CSP)
│       ├── routes/          # Dedicated Hono route handlers (auth, content, media, health)
│       ├── types.ts         # Cloudflare Worker environment bindings
│       └── index.ts         # Worker main entry point
├── tests/
│   ├── e2e/                 # Playwright end-to-end tests
│   ├── integration/         # Worker API integration tests via Hono test runner
│   └── unit/                # Security, URL sanitizer, and validation unit tests
├── astro.config.mjs
├── package.json
├── playwright.config.ts
├── schema.sql
├── tsconfig.json
├── vitest.config.ts
└── wrangler.toml
```

---

## CLI Prerequisites

Ensure you have the required CLI tools installed and authenticated on your machine:

| Tool | Minimum Version | Installation / Auth |
| :--- | :--- | :--- |
| **Node.js** | `>= 24.0.0` | [nodejs.org](https://nodejs.org/) |
| **Wrangler** | `>= 4.0.0` | Included in devDependencies (`npx wrangler login`) |
| **Neon CLI (`neonctl`)** | Latest | `npm install -g neonctl` (`neonctl auth`) |
| **GitHub CLI (`gh`)** | Latest | [cli.github.com](https://cli.github.com/) (`gh auth login`) |

---

## Complete CLI Setup & Deployment Guide

### 1. Clone & Install Dependencies

```sh
git clone git@github.com:rizqonfah/northstar-it-services.git
cd northstar-it-services
npm install
```

---

### 2. Provision Neon Postgres Database via CLI

Authenticate with Neon and create a new project:

```sh
# 1. Login to Neon
neonctl auth

# 2. Create project
neonctl projects create --name northstar-it-services --region-id aws-ap-southeast-1

# 3. Retrieve the connection string
neonctl connection-string --pooled
```

Apply the database schema directly via `neonctl` (or `psql`):

```sh
neonctl sql "CREATE TABLE IF NOT EXISTS site_content (id integer PRIMARY KEY CHECK (id = 1), content jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());"
```

---

### 3. Setup Neon Object Storage via CLI / Dashboard

1. Enable **Neon Object Storage** in your project settings.
2. Note your S3 Endpoint, Region, Access Key, Secret Key, and Bucket Name (`northstar-assets`).

---

### 4. Create Local Development Variables (`.dev.vars`)

Create `.dev.vars` in your repository root:

```ini
ENVIRONMENT=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
AWS_ENDPOINT_URL_S3=https://YOUR-BRANCH.storage.c-2.ap-southeast-1.aws.neon.tech
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=YOUR_NEON_STORAGE_TOKEN_ID
AWS_SECRET_ACCESS_KEY=YOUR_NEON_STORAGE_SECRET
OBJECT_STORAGE_BUCKET=northstar-assets
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_JWT_SECRET=your-random-32-character-secret-key
```

---

### 5. Run Local Development Server

Start the local server backed by your local `.dev.vars`:

```sh
npm run dev
```

- **Website**: [http://127.0.0.1:8787/](http://127.0.0.1:8787/)
- **Content Studio**: [http://127.0.0.1:8787/admin/](http://127.0.0.1:8787/admin/)

---

### 6. Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Build and launch local preview with Wrangler on `127.0.0.1:8787` |
| `npm run build` | Compile Astro static files and bundle Vite client assets |
| `npm run typecheck` | Run TypeScript type checks (`tsc --noEmit`) |
| `npm run test` | Run all unit and integration tests via Vitest |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run test:e2e` | Run browser E2E test suite via Playwright |
| `npm run deploy` | Build and deploy directly to Cloudflare Workers |

---

### 7. Content Studio (`/admin/`) Access

1. Open `/admin/` in your browser.
2. Sign in using your `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
3. Edit content across **Overview**, **Hero**, **Services**, **Projects**, **About**, and **Contact & SEO**.
4. Upload project images directly (JPEG, PNG, WebP, AVIF up to 8 MB) via secure signed POST forms.
5. Click **Save changes** to persist changes immediately to Neon Postgres.
6. Click **Sign out** to invalidate the session cookie.

---

## Security Best Practices

- **Host Header Spoofing Protected**: Environment mode strictly relies on explicit `ENVIRONMENT` binding (`wrangler.toml` enforces `production`).
- **Timing-Safe Auth**: Admin password verification uses constant-time string comparison (`timingSafeEqual`).
- **Rate Limiting**: `/api/admin/login` enforces a 5-failed-attempts per 15-minute sliding window per IP.
- **Strict CSP & Security Headers**: Enforces `nosniff`, `DENY` framing, `strict-origin`, and a hardened `Content-Security-Policy`.
- **Canonical Media Extensions**: S3 uploads enforce canonical extensions based on validated MIME types.
- **Payload Size Limiter**: API endpoints enforce a 1 MB body limit to thwart JSON DoS.
- **Safe URL Sanitization**: Project images validate against `javascript:` and arbitrary schemes before rendering.
- **Never commit `.dev.vars`**: Strictly ignored by `.gitignore`.
- **Rotate Secrets**: Secrets can be updated anytime using `wrangler secret put <KEY>`.
- **Cloudflare Access (Optional)**: Set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` secrets to require Cloudflare Zero Trust authentication.
