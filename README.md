# Northstar IT Services — Astro + Preact + Workers + Neon

Modern IT services landing page with an integrated Preact Content Studio (CMS), powered by Cloudflare Workers and Neon Serverless Postgres + Object Storage.

---

## Architecture & Stack

- **Frontend**: Astro static site with server-rendered Preact islands.
- **CMS Studio**: Preact single-page application at `/admin/`.
- **Backend / API**: Hono framework running on Cloudflare Workers (`/api/*`).
- **Database**: Neon Serverless Postgres (`site_content` singleton JSONB schema).
- **Media Storage**: Neon Object Storage (S3-compatible) with browser-direct presigned POST forms.
- **Authentication**: Built-in signed JWT session cookies (`ADMIN_USERNAME` & `ADMIN_PASSWORD`) with optional Cloudflare Access Zero Trust JWT validation.

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

Follow these sequential CLI steps to configure the entire stack from scratch.

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
# Run schema migration using neonctl
neonctl sql "CREATE TABLE IF NOT EXISTS site_content (id integer PRIMARY KEY CHECK (id = 1), content jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());"
```

---

### 3. Setup Neon Object Storage via CLI / Dashboard

1. Enable Object Storage on your project branch:
   - S3 Endpoint format: `https://<BRANCH_ID>.storage.<REGION_HOST>`
   - Region: `ap-southeast-1` (or your chosen Neon region)
2. Create bucket `northstar-assets` with `public_read` permissions.
3. Generate a branch credential scoped to `storage:write` to get:
   - `AWS_ACCESS_KEY_ID` (Token ID)
   - `AWS_SECRET_ACCESS_KEY` (S3 Secret Key)

---

### 4. Configure Local Environment (`.dev.vars`) via CLI

Generate your local `.dev.vars` file using the command line:

#### On Linux / macOS (Bash):
```sh
cat << 'EOF' > .dev.vars
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
AWS_ENDPOINT_URL_S3=https://YOUR-BRANCH.storage.c-2.ap-southeast-1.aws.neon.tech
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=YOUR_NEON_STORAGE_TOKEN_ID
AWS_SECRET_ACCESS_KEY=YOUR_NEON_STORAGE_SECRET
OBJECT_STORAGE_BUCKET=northstar-assets
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_JWT_SECRET=northstar-session-secret-key-prod-random-8201
EOF
```

#### On Windows (PowerShell):
```powershell
@"
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
AWS_ENDPOINT_URL_S3=https://YOUR-BRANCH.storage.c-2.ap-southeast-1.aws.neon.tech
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=YOUR_NEON_STORAGE_TOKEN_ID
AWS_SECRET_ACCESS_KEY=YOUR_NEON_STORAGE_SECRET
OBJECT_STORAGE_BUCKET=northstar-assets
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_JWT_SECRET=northstar-session-secret-key-prod-random-8201
"@ | Out-File -FilePath .dev.vars -Encoding utf8
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

### 6. Authenticate & Configure Cloudflare Worker Secrets via CLI

Log in to Cloudflare:

```sh
npx wrangler login
```

Upload production secrets to Cloudflare Workers using non-interactive CLI piping:

#### Bash / macOS / Linux:
```sh
echo "postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" | npx wrangler secret put DATABASE_URL
echo "https://YOUR-BRANCH.storage.c-2.ap-southeast-1.aws.neon.tech" | npx wrangler secret put AWS_ENDPOINT_URL_S3
echo "ap-southeast-1" | npx wrangler secret put AWS_REGION
echo "YOUR_NEON_STORAGE_TOKEN_ID" | npx wrangler secret put AWS_ACCESS_KEY_ID
echo "YOUR_NEON_STORAGE_SECRET" | npx wrangler secret put AWS_SECRET_ACCESS_KEY
echo "northstar-assets" | npx wrangler secret put OBJECT_STORAGE_BUCKET
echo "admin" | npx wrangler secret put ADMIN_USERNAME
echo "YourSecurePassword123!" | npx wrangler secret put ADMIN_PASSWORD
echo "northstar-session-secret-key-prod-random-8201" | npx wrangler secret put ADMIN_JWT_SECRET
```

#### Windows PowerShell:
```powershell
"postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require" | npx wrangler secret put DATABASE_URL
"https://YOUR-BRANCH.storage.c-2.ap-southeast-1.aws.neon.tech" | npx wrangler secret put AWS_ENDPOINT_URL_S3
"ap-southeast-1" | npx wrangler secret put AWS_REGION
"YOUR_NEON_STORAGE_TOKEN_ID" | npx wrangler secret put AWS_ACCESS_KEY_ID
"YOUR_NEON_STORAGE_SECRET" | npx wrangler secret put AWS_SECRET_ACCESS_KEY
"northstar-assets" | npx wrangler secret put OBJECT_STORAGE_BUCKET
"admin" | npx wrangler secret put ADMIN_USERNAME
"YourSecurePassword123!" | npx wrangler secret put ADMIN_PASSWORD
"northstar-session-secret-key-prod-random-8201" | npx wrangler secret put ADMIN_JWT_SECRET
```

---

### 7. Build & Deploy to Cloudflare Workers

Build static assets with Astro and deploy the Worker + assets with Wrangler:

```sh
npm run deploy
```

Once deployment completes, your Worker URL will be displayed in the terminal:
`https://northstar-it-services.<your-subdomain>.workers.dev`

---

### 8. GitHub CLI Management (`gh`)

Manage and push repository changes:

```sh
# Check auth status
gh auth status

# Create private repository and push (if starting from scratch)
gh repo create northstar-it-services --private --source=. --remote=origin --push

# Push existing commits
git add .
git commit -m "docs: update setup instructions for CLI"
git push origin main
```

---

## Content Studio (`/admin/`) Access

1. Open `/admin/` in your browser.
2. Sign in using your `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
3. Edit content across **Overview**, **Hero**, **Services**, **Projects**, **About**, and **Contact & SEO**.
4. Upload project images directly (JPEG, PNG, WebP, AVIF up to 8 MB) via secure signed POST forms.
5. Click **Save changes** to persist changes immediately to Neon Postgres.
6. Click **Sign out** to invalidate the session cookie.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| 
pm run dev | Build and launch local preview on 127.0.0.1:8787 |
| 
pm run build | Compile Astro static files and bundle Vite client assets |
| 
pm run typecheck | Run TypeScript type checks (	sc --noEmit) |
| 
pm run deploy | Build and deploy directly to Cloudflare Workers |

---

## Security Best Practices

- **Host Header Spoofing Protected**: Environment mode strictly relies on explicit ENVIRONMENT binding.
- **Timing-Safe Auth**: Admin password verification uses constant-time string comparison.
- **Rate Limiting**: /api/admin/login enforces a 5-failed-attempts per 15-minute sliding window per IP.
- **Strict CSP & Security Headers**: Enforces nosniff, DENY framing, strict-origin, and Content-Security-Policy.
- **Canonical Media Extensions**: S3 uploads enforce canonical extensions based on validated MIME types.
- **Payload Size Limiter**: API endpoints enforce a 1 MB body limit to thwart JSON DoS.
- **Safe URL Sanitization**: Project images validate against javascript: and arbitrary schemes before rendering.

- **Never commit `.dev.vars`**: It is strictly ignored by `.gitignore`.
- **Rotate Secrets**: Secrets can be updated anytime using `wrangler secret put <KEY>`.
- **Cloudflare Access (Optional)**: For enterprise setups, you can add `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` secrets to require Cloudflare Zero Trust authentication in addition to or instead of form login.
