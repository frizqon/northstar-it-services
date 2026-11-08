# Secret Setup & Rotation Guide

This guide lists every credential used by Northstar IT Services, how to generate or retrieve it, and how to store it with the CLI without leaking it into shell history, logs, or git.

Use this guide together with [`OPERATIONS.md`](./OPERATIONS.md). Dashboard-only controls such as WAF, Access, and Turnstile are documented there.

---

## 1. Scope

| Scope | Where it lives | Used by |
| --- | --- | --- |
| GitHub Actions secrets | GitHub repository settings | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |
| Worker secrets | Cloudflare Worker `northstar-it-services` | `src/worker/*` at runtime |
| Local development secrets | `.dev.vars` on your machine | `wrangler dev`, local tests |

Rules:

- Never commit real values. `.dev.vars`, `.env`, and `.wrangler/` are ignored.
- Never use `gh secret set NAME --body "value"` with a real value. It lands in shell history.
- Never paste a value into an issue, pull request, chat, screenshot, or CI log.
- Prefer the hidden prompt from `gh secret set NAME` and `npx wrangler secret put NAME`.
- Store a copy in your password manager. GitHub Actions secrets cannot be read back.

---

## 2. Quick start

Authenticate first:

```sh
gh auth login
gh auth status

npx wrangler login
npx wrangler whoami
```

Set a GitHub Actions secret with the hidden prompt:

```sh
gh secret set SECRET_NAME --repo frizqon/northstar-it-services
```

Set a Worker secret with the hidden prompt:

```sh
npx wrangler secret put SECRET_NAME
```

Verify names only:

```sh
gh secret list --repo frizqon/northstar-it-services
npx wrangler secret list
```

Trigger a deploy and verify notifications:

```sh
gh workflow run deploy.yml --repo frizqon/northstar-it-services --ref main
gh run list --repo frizqon/northstar-it-services --workflow deploy.yml --limit 1
gh run watch RUN_ID --repo frizqon/northstar-it-services --exit-status
```

---

## 3. Secret inventory

### 3.1 GitHub Actions secrets

| Name | Required | Used for | Source |
| --- | --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Wrangler deploy | `npx wrangler whoami` |
| `CLOUDFLARE_API_TOKEN` | Yes | Wrangler deploy | Cloudflare dashboard |
| `DATABASE_URL` | Yes | Migrations and CMS build | Neon console |
| `NOTIFICATION_EMAIL` | Yes for email | Deploy email recipient | Your inbox |
| `RESEND_API_KEY` | Yes for email | Deploy email sender | Resend dashboard |
| `TELEGRAM_BOT_TOKEN` | Yes for Telegram | Deploy and CI notifications | Telegram BotFather |
| `TELEGRAM_CHAT_ID` | Yes for Telegram | Deploy and CI notifications | Telegram Bot API |

### 3.2 Worker secrets

| Name | Required | Used for | Source |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres access | Neon console |
| `ADMIN_USERNAME` | Yes | Admin login | You choose |
| `ADMIN_PASSWORD` | Yes | Admin login | Generate randomly |
| `ADMIN_JWT_SECRET` | Yes | Admin session signing | Generate randomly |
| `AWS_ENDPOINT_URL_S3` | Yes | Neon Object Storage | Neon console |
| `AWS_REGION` | Yes | Neon Object Storage | Neon console |
| `AWS_ACCESS_KEY_ID` | Yes | Neon Object Storage | Neon console |
| `AWS_SECRET_ACCESS_KEY` | Yes | Neon Object Storage | Neon console |
| `OBJECT_STORAGE_BUCKET` | Yes | Neon Object Storage | Neon console |
| `GITHUB_REPO` | Yes | CMS rebuild dispatch target | `frizqon/northstar-it-services` |
| `GITHUB_DISPATCH_TOKEN` | Yes | CMS rebuild dispatch | GitHub fine-grained PAT |
| `TURNSTILE_SITE_KEY` | Optional | Contact form challenge | Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Optional | Contact form challenge | Cloudflare Turnstile |
| `CF_ACCESS_TEAM_DOMAIN` | Optional | Cloudflare Access JWT check | Cloudflare Zero Trust |
| `CF_ACCESS_AUD` | Optional | Cloudflare Access JWT check | Cloudflare Zero Trust |

`DATABASE_URL` is used by both scopes. Set the same production connection string in both places.

`GITHUB_REPO` is not sensitive, but the Worker reads it as an environment binding. Keep the value exactly `frizqon/northstar-it-services`.

---

## 4. Generate or retrieve each credential

Some providers do not expose a public API for creating credentials. These steps still require a dashboard or chat:

| Credential | CLI creation possible? | Notes |
| --- | --- | --- |
| Cloudflare API token | No | Create in the Cloudflare dashboard, then store with `gh secret set`. |
| Telegram bot token | No | Create or revoke with `@BotFather`, then store with `gh secret set`. |
| Resend API key | No | Create in the Resend dashboard, then store with `gh secret set`. |
| GitHub fine-grained PAT | No | Create in the GitHub web UI, then store with `npx wrangler secret put`. |
| Neon connection string | Yes | Use `neonctl connection-string`. |
| Neon Object Storage key | Console | Create the bucket and access key in the Neon console. |

### 4.1 Cloudflare account ID and API token

Account ID:

```sh
npx wrangler whoami
```

Copy the account ID for the account that owns the `northstar-it-services` Worker.

API token:

1. Open **Cloudflare Dashboard → My Profile → API Tokens → Create Token**.
2. Choose **Create Custom Token**.
3. Add **Account → Workers Scripts → Edit**.
4. Account resources: include the account that owns the Worker.
5. Zone resources: not required for `workers.dev`.
6. Set an expiry. Prefer 90 days and a rotation reminder; use no expiry only when rotation is tracked elsewhere.
7. Create the token and copy it once.

The token value is shown only once. Store it in your password manager before leaving the page.

Set:

```sh
gh secret set CLOUDFLARE_ACCOUNT_ID --repo frizqon/northstar-it-services
gh secret set CLOUDFLARE_API_TOKEN --repo frizqon/northstar-it-services
```

Do not use the short-lived Wrangler OAuth token as `CLOUDFLARE_API_TOKEN`. It expires and is not intended for CI.

If the token later returns `401` or `403`, check:

- The token has **Workers Scripts: Edit**.
- The token is not expired.
- `CLOUDFLARE_ACCOUNT_ID` matches the account that owns the Worker.

### 4.2 Neon `DATABASE_URL`

1. Open the Neon console for project `weathered-paper-52220882`.
2. Select the production branch (`main`).
3. Open **Connect** and copy the connection string.
4. Copy only the `postgresql://...` URI. Do not copy labels, notes, or multiple lines.

If you use the Neon CLI, the equivalent is:

```sh
npx neonctl connection-string main --project-id weathered-paper-52220882 --pooled
```

Omit `--pooled` to get the direct connection string. Use only the URI line from the output.

Set the production connection string in both scopes (usually the same pooled URI):

```sh
gh secret set DATABASE_URL --repo frizqon/northstar-it-services
npx wrangler secret put DATABASE_URL
```

Common failure: pasting a multi-line value such as:

```text
URI: postgresql://...
```

The deploy fails with a `db:migrate` parse error. Fix it by setting only the `postgresql://...` URI.

Use the pooled connection string for the Worker. If migrations fail because of pooling, use the direct connection string for the GitHub Actions secret and keep the pooled string for the Worker.

### 4.3 Telegram bot token and chat ID

Create or reuse a bot:

1. Open Telegram and start a chat with `@BotFather`.
2. Send `/newbot` and follow the prompts, or `/token` to retrieve an existing token.
3. Copy the bot token.
4. Add the bot to the target group.
5. Send a message in the group, then read the chat ID:

```sh
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"
```

Look for:

```json
"chat": {
  "id": -1001234567890,
  "title": "Northstar IT Service Deploy Logs",
  "type": "supergroup"
}
```

Group and supergroup IDs are negative. Do not strip the minus sign.

Set:

```sh
gh secret set TELEGRAM_BOT_TOKEN --repo frizqon/northstar-it-services
gh secret set TELEGRAM_CHAT_ID --repo frizqon/northstar-it-services
```

PowerShell:

```powershell
curl.exe -s -X POST "https://api.telegram.org/bot$env:TELEGRAM_BOT_TOKEN/sendMessage" `
  -d "chat_id=$env:TELEGRAM_CHAT_ID" `
  -d "text=Northstar notification test"
```

POSIX:

```sh
curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "text=Northstar notification test"
```

If the bot is not a group member, or the chat ID is wrong, Telegram returns `400` or `403`.

### 4.4 Resend API key and notification email

1. Open **Resend → API Keys → Create API Key**.
2. Name it for this project, for example `northstar-deploy`.
3. Permission: **Sending access**.
4. Copy the `re_...` key once and store it in your password manager.
5. Set the recipient email:

```sh
gh secret set RESEND_API_KEY --repo frizqon/northstar-it-services
gh secret set NOTIFICATION_EMAIL --repo frizqon/northstar-it-services
```

The deploy workflow currently sends from:

```text
Northstar Deploy <onboarding@resend.dev>
```

`onboarding@resend.dev` is a shared test sender. It only delivers to the Resend account owner's email. To send to any other address:

1. Verify a domain in Resend.
2. Change the `from` value in `.github/scripts/send-notification.mjs`.
3. Commit and merge through a pull request.

Test the key directly. Replace `owner@example.com` with the Resend account owner's email.

PowerShell:

```powershell
$body = @{
  from = "Northstar Deploy <onboarding@resend.dev>"
  to = @("owner@example.com")
  subject = "Northstar test"
  html = "<p>test</p>"
} | ConvertTo-Json -Compress
$body | curl.exe -s -X POST "https://api.resend.com/emails" `
  -H "Authorization: Bearer $env:RESEND_API_KEY" `
  -H "Content-Type: application/json" `
  --data-binary "@-"
```

POSIX:

```sh
BODY='{"from":"Northstar Deploy <onboarding@resend.dev>","to":["owner@example.com"],"subject":"Northstar test","html":"<p>test</p>"}'
printf '%s' "$BODY" | curl -s -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @-
```

A successful response contains an email `id`. A `403` usually means the recipient is not the Resend account owner and no verified domain is configured.

### 4.5 GitHub fine-grained PAT for CMS dispatch

Create the token:

1. Open **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Choose **Generate new token**.
3. Resource owner: `frizqon`.
4. Repository access: **Only select repositories → `northstar-it-services`**.
5. Repository permissions: **Contents → Read and write**.
6. Set an expiry or choose no expiry for automation.
7. Generate and copy the `github_pat_...` value once.

Set the Worker secret:

```sh
npx wrangler secret put GITHUB_DISPATCH_TOKEN
```

Set the repository target:

```sh
npx wrangler secret put GITHUB_REPO
# value: frizqon/northstar-it-services
```

Do not use `gh auth token` as `GITHUB_DISPATCH_TOKEN`. That OAuth token is broad and may expire.

Verify the token can read the repository:

```sh
curl -s -H "Authorization: Bearer $GITHUB_DISPATCH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/frizqon/northstar-it-services
```

Optional dispatch test (this triggers a deploy):

```sh
gh api repos/frizqon/northstar-it-services/dispatches \
  -f event_type=cms-content-updated
```

A `403` means the PAT lacks **Contents: Read and write**. A `404` means the repository scope or `GITHUB_REPO` value is wrong.

### 4.6 Admin username, password, and JWT secret

Generate strong values:

```sh
node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))'
```

Use one generated value for `ADMIN_PASSWORD` and a different one for `ADMIN_JWT_SECRET`. Choose a non-default `ADMIN_USERNAME`.

Set:

```sh
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_JWT_SECRET
```

Do not put these values in `.dev.vars.example`, test fixtures, Playwright config, workflow YAML, or source code. CI and E2E tests generate their own credentials per run.

### 4.7 Neon Object Storage credentials

1. Open the Neon console for the project.
2. Open **Object Storage**.
3. Create or select the media bucket.
4. Create an access key with read/write access to that bucket.
5. Copy the endpoint, region, access key ID, secret access key, and bucket name.

Set:

```sh
npx wrangler secret put AWS_ENDPOINT_URL_S3
npx wrangler secret put AWS_REGION
npx wrangler secret put AWS_ACCESS_KEY_ID
npx wrangler secret put AWS_SECRET_ACCESS_KEY
npx wrangler secret put OBJECT_STORAGE_BUCKET
```

The secret access key is shown once. Store it in your password manager.

### 4.8 Optional Turnstile

1. Open **Cloudflare Dashboard → Turnstile → Add site**.
2. Add the production hostname: `northstar-it-services.frizqon.workers.dev`.
3. Copy the site key and secret key.

Set:

```sh
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
```

To disable Turnstile, delete both secrets:

```sh
npx wrangler secret delete TURNSTILE_SITE_KEY
npx wrangler secret delete TURNSTILE_SECRET_KEY
```

The contact form falls back to the existing rate limiter when the keys are absent.

### 4.9 Optional Cloudflare Access

After configuring Access for `/admin/*` and `/api/admin/*`:

```sh
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler secret put CF_ACCESS_AUD
```

`CF_ACCESS_TEAM_DOMAIN` is the team domain, for example `your-team.cloudflareaccess.com`. `CF_ACCESS_AUD` is the application audience tag.

---

## 5. Set secrets safely from the CLI

### 5.1 PowerShell helpers

Use hidden prompts instead of `--body`. Add these functions to your PowerShell profile or paste them into the current session:

```powershell
function Set-GhSecret {
  param([Parameter(Mandatory)][string]$Name)
  $secure = Read-Host -AsSecureString "$Name"
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $value | gh secret set $Name --repo frizqon/northstar-it-services
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    Remove-Variable value -ErrorAction SilentlyContinue
  }
}

function Set-WorkerSecret {
  param([Parameter(Mandatory)][string]$Name)
  $secure = Read-Host -AsSecureString "$Name"
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $value | npx wrangler secret put $Name
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    Remove-Variable value -ErrorAction SilentlyContinue
  }
}
```

Usage:

```powershell
Set-GhSecret CLOUDFLARE_API_TOKEN
Set-GhSecret RESEND_API_KEY
Set-GhSecret TELEGRAM_BOT_TOKEN
Set-WorkerSecret DATABASE_URL
Set-WorkerSecret GITHUB_DISPATCH_TOKEN
```

### 5.2 POSIX helpers

```sh
gh_secret() {
  name="$1"
  printf '%s: ' "$name" >&2
  stty -echo
  IFS= read -r value
  stty echo
  printf '\n' >&2
  printf '%s' "$value" | gh secret set "$name" --repo frizqon/northstar-it-services
  unset value
}

worker_secret() {
  name="$1"
  printf '%s: ' "$name" >&2
  stty -echo
  IFS= read -r value
  stty echo
  printf '\n' >&2
  printf '%s' "$value" | npx wrangler secret put "$name"
  unset value
}
```

Usage:

```sh
gh_secret CLOUDFLARE_API_TOKEN
worker_secret GITHUB_DISPATCH_TOKEN
```

### 5.3 Bulk import

Bulk import is faster but riskier because values exist in a temporary file. Use only a filtered file in your OS temp directory, never the repository.

GitHub Actions:

```powershell
$file = Join-Path $env:TEMP "northstar-actions.env"
notepad $file
# Fill only the seven GitHub Actions keys.
gh secret set -f $file --repo frizqon/northstar-it-services
Remove-Item $file -Force
```

POSIX:

```sh
file="$(mktemp)"
$EDITOR "$file"
# Fill only the seven GitHub Actions keys.
gh secret set -f "$file" --repo frizqon/northstar-it-services
rm -f "$file"
```

Worker:

```powershell
$file = Join-Path $env:TEMP "northstar-worker.env"
notepad $file
# Fill only Worker secrets. Do not include ENVIRONMENT.
npx wrangler secret bulk $file
Remove-Item $file -Force
```

POSIX:

```sh
file="$(mktemp)"
$EDITOR "$file"
# Fill only Worker secrets. Do not include ENVIRONMENT.
npx wrangler secret bulk "$file"
rm -f "$file"
```

Important:

- Do not run `npx wrangler secret bulk .dev.vars` directly. `.dev.vars` contains local values and `ENVIRONMENT=development`. Uploading it would override the production `ENVIRONMENT` binding and may break auth and security checks.
- Do not run `gh secret set -f` on a full `.env` file unless every key in it is intended for GitHub Actions.
- Delete the temporary file immediately after import.

### 5.4 Things to avoid

```sh
# Do not do this with real values.
gh secret set RESEND_API_KEY --repo frizqon/northstar-it-services --body "re_..."
npx wrangler secret put RESEND_API_KEY --body "re_..."
echo "re_..." >> .dev.vars
git add -f .dev.vars
```

Avoid:

- `--body` with a real value.
- `export SECRET=...` in a shared shell.
- `cat`, `echo`, `printf`, or `set -x` around secrets.
- Screenshots of provider pages that show a new key.
- Copying a secret into a chat, issue, pull request, or commit message.

---

## 6. Verification checklist

1. Confirm secret names:

   ```sh
   gh secret list --repo frizqon/northstar-it-services
   npx wrangler secret list
   ```

2. Trigger a deploy:

   ```sh
   gh workflow run deploy.yml --repo frizqon/northstar-it-services --ref main
   gh run list --repo frizqon/northstar-it-services --workflow deploy.yml --limit 1
   gh run watch RUN_ID --repo frizqon/northstar-it-services --exit-status
   ```

3. Confirm notifications in the job log:

   ```powershell
   gh run view --job JOB_ID --repo frizqon/northstar-it-services --log |
     Select-String "Notification email sent successfully|Telegram notification sent successfully"
   ```

   POSIX:

   ```sh
   gh run view --job JOB_ID --repo frizqon/northstar-it-services --log |
     grep -E "Notification email sent successfully|Telegram notification sent successfully"
   ```

4. Confirm production health:

   ```sh
   curl -s https://northstar-it-services.frizqon.workers.dev/api/health
   ```

   Expected:

   ```json
   {"ok":true,"mode":"neon","environment":"production"}
   ```

5. Optional: open a pull request targeting `main` and confirm the CI Telegram notification arrives.

---

## 7. Rotation and incident response

### 7.1 Normal rotation

1. Create the replacement credential in the provider dashboard.
2. Update every scope that uses it.
3. Deploy or rerun the deploy workflow.
4. Verify health and notifications.
5. Revoke the old credential.

Commands:

```sh
# GitHub Actions
gh secret set NAME --repo frizqon/northstar-it-services

# Worker
npx wrangler secret put NAME
```

### 7.2 Rotation map

| Credential | Where to rotate | Scopes to update |
| --- | --- | --- |
| Cloudflare API token | Cloudflare dashboard → API Tokens | `CLOUDFLARE_API_TOKEN` |
| Resend API key | Resend dashboard → API Keys | `RESEND_API_KEY` |
| Telegram bot token | BotFather → `/revoke` | `TELEGRAM_BOT_TOKEN` |
| GitHub dispatch PAT | GitHub → Fine-grained tokens | `GITHUB_DISPATCH_TOKEN` |
| Neon database password | Neon console → Roles | `DATABASE_URL` in Actions and Worker |
| Neon Object Storage key | Neon console → Object Storage | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| Admin password | Generate a new value | `ADMIN_PASSWORD` |
| Admin JWT secret | Generate a new value | `ADMIN_JWT_SECRET` |
| Turnstile keys | Cloudflare Turnstile | `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |

### 7.3 If a secret leaks

1. Revoke or roll the credential first. Do not wait for a deploy.
2. Create a replacement and update the affected scope.
3. Deploy and verify health.
4. Check Worker logs, GitHub Actions logs, and provider audit logs for abuse.
5. If the value was committed, remove it from git history before making the repository public. Rotating the credential is still mandatory.
6. Run a secret scan:

   ```sh
   gitleaks detect --source . --no-banner
   ```

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `db:migrate` parse error or `URI:` in error | `DATABASE_URL` contains a newline or label | Set only the `postgresql://...` URI |
| Cloudflare `401` | Token missing, expired, or wrong account | Recreate token and set `CLOUDFLARE_API_TOKEN` |
| Cloudflare `403` | Token lacks **Workers Scripts: Edit** | Edit the token permissions |
| Wrangler asks you to log in during CI | `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` missing | Set both Actions secrets |
| Email notification skipped | `RESEND_API_KEY` or `NOTIFICATION_EMAIL` missing | Set both Actions secrets |
| Resend `403` | Recipient is not the account owner and no domain is verified | Verify a domain and update the `from` address |
| Telegram `400` or `403` | Bot not in group, wrong chat ID, or minus sign removed | Re-add bot and copy the negative chat ID |
| CMS save does not rebuild | `GITHUB_DISPATCH_TOKEN` or `GITHUB_REPO` wrong | Recreate PAT with **Contents: Read and write** and set `frizqon/northstar-it-services` |
| GitHub dispatch `404` | PAT scoped to another repository | Regenerate with only `northstar-it-services` |
| `gh secret set` returns `404` | Wrong repository or no admin access | Check `gh auth status` and the `--repo` value |
| Turnstile challenge missing | Keys absent | Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` |
| Admin login fails after deploy | `ADMIN_*` secrets changed or missing | Re-set the Worker secrets and redeploy |

---

## 9. References

- GitHub encrypted secrets: <https://docs.github.com/en/actions/security-guides/encrypted-secrets>
- GitHub fine-grained PATs: <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens>
- Cloudflare API tokens: <https://developers.cloudflare.com/fundamentals/api/get-started/create-token/>
- Wrangler secrets: <https://developers.cloudflare.com/workers/configuration/secrets/>
- Neon connection strings: <https://neon.tech/docs/connect/connect-from-any-app>
- Resend API keys: <https://resend.com/docs/dashboard/api-keys/introduction>
- Telegram BotFather: <https://core.telegram.org/bots/features#botfather>
