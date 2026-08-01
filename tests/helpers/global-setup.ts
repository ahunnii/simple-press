import { execSync } from "node:child_process";

import "./test-env";

import { assertDisposableTestDatabase } from "./assert-test-database";

// Runs once before the integration project. Syncs the Prisma schema into the
// throwaway test database. Requires the test Postgres to be up
// (`pnpm test:db:up`). `--skip-generate` reuses the already-generated client.
//
// The guard below is not optional ceremony: `--accept-data-loss` drops tables
// and columns to make the target match schema.prisma, and this command inherits
// whatever DATABASE_URL is in the environment. `./test-env` only supplies a
// DEFAULT (via `??=`), so a shell export or an auto-loaded .env silently wins —
// and both .env files in this repo point at remote servers. Verify before
// destroying. See tests/helpers/assert-test-database.ts.
export default function setup() {
  assertDisposableTestDatabase();

  execSync("pnpm exec prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: process.env,
  });
}
