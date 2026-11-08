import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8787',
    trace: 'on-first-retry'
  },
  webServer: {
    // Force the worker's in-memory demo store so E2E never writes to the production Neon database.
    command:
      'npm run build && npx wrangler dev --ip 127.0.0.1 --port 8787 --var ENVIRONMENT:development --var DATABASE_URL: --var DEV_AUTH_BYPASS:true',
    url: 'http://127.0.0.1:8787/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
