# AGENTS.md — Agent Coding Guidelines for Northstar IT Services

This document defines the strict development rules, architectural standards, security principles, and testing guidelines for AI coding agents (Antigravity, Cursor, Claude Code, Copilot, etc.) working on this repository.

---

## 1. 🌐 Language Rules

- **Chat & User Interaction**: Respond and communicate with the user in **Bahasa Indonesia**.
- **Source Code & Documentation**: Write all code, variable names, function names, types, comments, git commit messages, tests, and PR descriptions in **English**.

---

## 2. 🏗️ Tech Stack & Architecture Overview

- **Framework**: [Astro 5](https://astro.build/) (`output: 'static'`) with Preact islands (`@astrojs/preact`).
- **Edge Backend**: [Cloudflare Workers](https://workers.cloudflare.com/) powered by [Hono 4](https://hono.dev/) mounted at `/api/*`.
- **Database**: [Neon Serverless Postgres](https://neon.tech/) (`@neondatabase/serverless`) storing `site_content` in a singleton JSONB row.
- **Media Storage**: Neon Object Storage (AWS S3-compatible via `@aws-sdk/client-s3` and `@aws-sdk/s3-presigned-post`).
- **Testing**:
  - [Vitest](https://vitest.dev/) for unit and worker integration tests (`npm run test`).
  - [Playwright](https://playwright.dev/) for browser end-to-end tests (`npm run test:e2e`).
- **Styling**: Modern vanilla CSS in `src/styles/global.css` with responsive breakpoints (mobile, tablet, desktop).

---

## 3. 🌿 Git & Branching Workflow

Follow [`WORKFLOW.md`](./WORKFLOW.md) strictly:

1. **Active Development Branch**:
   - Always verify active branch is `dev` (`git branch`) before writing any code.
   - **NEVER** push or commit directly to `main`.
2. **Quality Gates (Mandatory before commit)**:
   - Run `npm run typecheck` (`tsc --noEmit`) — must pass with 0 errors.
   - Run `npm run test` (Vitest) — all test suites must pass.
   - Run `npm run build` (`astro build`) — build must succeed cleanly.
3. **Commit Messages**:
   - Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
4. **Releasing to Production**:
   - Push to `origin dev`.
   - Submit a Pull Request from `dev` to `main`.
   - Merging into `main` automatically triggers GitHub Actions deployment to Cloudflare Workers.

---

## 4. 🛡️ Security Guidelines (Non-Negotiable)

1. **Host Header Spoofing Protection**:
   - **NEVER** rely on `new URL(c.req.url).hostname` alone to determine local vs production environment. An attacker can spoof `Host: localhost`.
   - Always check `c.env.ENVIRONMENT === 'development'`. Production environment is strictly set via `[vars] ENVIRONMENT = "production"` in `wrangler.toml`.
2. **Timing-Attack Resistance**:
   - Never use standard string equality (`!==` or `===`) to compare passwords, usernames, or secrets.
   - Always use `timingSafeEqual()` from `src/worker/lib/security.ts`.
3. **CSRF & Origin Verification**:
   - Protect all state-changing endpoints (`PUT /api/admin/content`, `POST /api/admin/media/presign`) using `isSafeOrigin()` from `src/worker/lib/security.ts`.
4. **Rate Limiting**:
   - Preserve `loginRateLimiter` middleware on `POST /api/admin/login` (blocks IP after 5 failed attempts in 15 minutes).
5. **Denial of Service (DoS) Prevention**:
   - Preserve `bodyLimit({ maxSize: 1024 * 1024 })` on all `/api/*` endpoints.
6. **S3 Upload Extension Enforcement**:
   - Never accept user file extensions directly. Strip the user extension and append canonical extensions mapped from validated MIME types (`ALLOWED_MEDIA_TYPES` in `src/worker/lib/s3.ts`).
7. **Safe Image URL Rendering**:
   - Always validate external image URLs using `isSafeImageUrl()` from `src/utils/url.ts` before rendering inside `<img src="..." />`. Block `javascript:`, `data:`, and protocol-relative URLs.
8. **Input Schema Validation**:
   - Always validate content payloads with `validateSiteContent()` from `src/worker/lib/db.ts` before saving to Postgres.
9. **Zero Secret Leakage**:
   - Never log secrets or credentials.
   - Never hardcode personal emails or API keys in workflows or source code.
   - Use centralized error handling (`app.onError`) to prevent stack trace leaks.

---

## 5. 🧩 Modular Code Conventions

### Backend Worker (`src/worker/`)
- Keep `src/worker/index.ts` thin (< 50 lines). It should only mount middleware and route modules.
- Place reusable database operations in `src/worker/lib/db.ts`.
- Place S3 upload logic in `src/worker/lib/s3.ts`.
- Place authentication & security functions in `src/worker/lib/security.ts` and `src/worker/middleware/`.
- Organize API endpoints into separate routers in `src/worker/routes/` (`auth.ts`, `content.ts`, `media.ts`, `health.ts`).

### Frontend Components (`src/components/`)
- **UI Primitives (`src/components/ui/`)**: Small, reusable UI controls (`InputField.tsx`, `StatCard.tsx`, `StatusDot.tsx`, `ToastNotice.tsx`).
- **Landing Sections (`src/components/landing/`)**: Modular sections of the public landing page (`Navbar.tsx`, `HeroSection.tsx`, `ServicesSection.tsx`, `WorkSection.tsx`, `AboutSection.tsx`, `ContactSection.tsx`, `Footer.tsx`).
- **Admin Studio (`src/components/admin/`)**: Isolated CMS modules (`LoginView.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`, `StatsOverview.tsx`, and `editors/*`).
- **Orchestrator Components**: `LandingPage.tsx` and `AdminApp.tsx` act solely as clean state managers and component composers.
- **Astro Layouts (`src/layouts/`)**: Use `BaseLayout.astro` for shared HTML shell, SEO tags, OpenGraph, Twitter cards, favicon, and fonts.
- **Accessibility**: All decorative icons, marks, and visual indicators must have `aria-hidden="true"`.

---

## 6. 🧪 Testing Conventions

Every new feature or bug fix must include or update corresponding tests in `tests/`:

- **Unit Tests (`tests/unit/`)**:
  - Test pure functions, validators, sanitizers, and security helpers.
- **Integration Tests (`tests/integration/`)**:
  - Test Worker API endpoints using Hono's `app.request()` with mock environments.
  - Test auth boundaries, rate limiting, and HTTP error responses.
- **E2E Tests (`tests/e2e/`)**:
  - Test browser UI interactions using Playwright.
- **Command Checklist**:
  ```sh
  npm run typecheck  # TypeScript check (strict)
  npm run test       # Vitest unit & integration tests
  npm run test:e2e   # Playwright browser tests
  npm run build      # Astro static build
  ```

---

## 7. 📁 Directory Tree Reference

```text
src/
├── components/
│   ├── admin/           # Content Studio CMS modules
│   │   ├── editors/     # Form editors per section
│   │   ├── AdminHeader.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── LoginView.tsx
│   │   └── StatsOverview.tsx
│   ├── landing/         # Public landing page sections
│   │   ├── AboutSection.tsx
│   │   ├── ContactSection.tsx
│   │   ├── Footer.tsx
│   │   ├── HeroSection.tsx
│   │   ├── Navbar.tsx
│   │   ├── ServicesSection.tsx
│   │   └── WorkSection.tsx
│   ├── ui/              # Reusable UI controls
│   │   ├── InputField.tsx
│   │   ├── StatCard.tsx
│   │   ├── StatusDot.tsx
│   │   └── ToastNotice.tsx
│   ├── AdminApp.tsx     # Admin app orchestrator
│   └── LandingPage.tsx  # Landing page orchestrator
├── content/             # Default data and types
├── layouts/             # Reusable Astro layouts
├── pages/               # Astro routes
├── styles/              # Global CSS & responsive styling
├── utils/               # Sanitizers and URL validators
└── worker/              # Cloudflare Worker backend
    ├── lib/             # Database, S3, and security libraries
    ├── middleware/      # Auth, rate limiting, security headers
    ├── routes/          # API route handlers
    ├── types.ts         # Worker environment types
    └── index.ts         # Worker entrypoint
```
