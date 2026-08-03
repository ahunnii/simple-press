import { defineConfig, devices } from "@playwright/test";

// Side-effect import: sets DATABASE_URL (port from TEST_PG_PORT), SKIP_ENV_VALIDATION, the Prisma
// field-encryption key, and the non-Stripe NEXT_PUBLIC_* dummies via `??=`. The
// orchestrator (scripts/e2e-stripe.sh) exports the REAL test Stripe keys
// (STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET
// / E2E_STRIPE_ACCOUNT_ID) into the environment BEFORE this runs, so `??=` keeps
// the real values — no dummy Stripe key shadows them.
import "./tests/helpers/test-env";

process.env.NEXT_PUBLIC_DEV_DOMAIN ??= "localhost:3000";

const PORT = 3000;

export default defineConfig({
  testDir: "./e2e/live",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Real hosted Checkout + the async webhook are slower than the stubbed flow.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: "list",
  use: {
    trace: "on-first-retry",
    navigationTimeout: 45_000,
    // Fail individual actions fast (the external hosted page is brittle) instead
    // of hanging until the whole-test timeout.
    actionTimeout: 15_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Must boot with the webhook secret captured by the orchestrator — never reuse
  // a stale dev server (which may carry the stub suite's dummy Stripe env).
  webServer: {
    command: "pnpm dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_DEV_DOMAIN: process.env.NEXT_PUBLIC_DEV_DOMAIN!,
    } as Record<string, string>,
  },
});
