import { execSync } from "node:child_process";

import "./test-env";

// Runs once before the integration project. Syncs the Prisma schema into the
// throwaway test database. Requires the test Postgres to be up
// (`pnpm test:db:up`). `--skip-generate` reuses the already-generated client.
export default function setup() {
  execSync("pnpm exec prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: process.env,
  });
}
