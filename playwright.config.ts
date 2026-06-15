import { defineConfig, devices } from "@playwright/test";

// Side-effect import: sets the test DSN (5433) + dummy env defaults via `??=`
// BEFORE the dev server inherits process.env. Mirrors the Vitest test harness so
// the running app's env-validated singletons construct without real credentials.
import "./tests/helpers/test-env";

// In dev mode the app reads NEXT_PUBLIC_DEV_DOMAIN to resolve the platform host;
// tenants are reached at <subdomain>.localhost:3000 (Chromium maps *.localhost to
// loopback automatically).
process.env.NEXT_PUBLIC_DEV_DOMAIN ??= "localhost:3000";

const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // A single Next dev server compiles routes on first hit; too many parallel
  // workers cause compile contention and slow first paints. Cap workers and give
  // assertions headroom to absorb first-compile latency.
  workers: process.env.CI ? 2 : 3,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // The DB must already be booted + seeded before this runs (see `pnpm test:e2e`
  // → scripts/e2e-pg.sh). The dev server only needs DATABASE_URL pointed at it.
  webServer: {
    command: "pnpm dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_DEV_DOMAIN: process.env.NEXT_PUBLIC_DEV_DOMAIN!,
    } as Record<string, string>,
  },
});
