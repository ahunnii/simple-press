import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const serverOnlyStub = fileURLToPath(
  new URL("./tests/helpers/empty-module.ts", import.meta.url),
);

// Three projects:
//  - unit:        pure functions, node env, no DB. Runs without Docker.
//  - dom:         React component/render tests, happy-dom. Runs without Docker.
//  - integration: tRPC + Prisma against the throwaway test Postgres. Needs Docker
//                 (`pnpm test:db:up`); a one-time schema push runs in globalSetup.
//
// Run the no-DB subset with: pnpm test:nodb
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": serverOnlyStub },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          // `tests/helpers` is included for test-harness units that must run
          // WITHOUT Docker — notably assert-test-database, which guards the
          // destructive `db push` in the integration project's globalSetup. It
          // deliberately cannot live in that project: its whole job is to run
          // before that setup, so a failure there must not depend on it.
          include: ["src/**/*.test.ts", "tests/helpers/**/*.test.ts"],
          setupFiles: ["tests/helpers/setup-node.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "happy-dom",
          include: ["src/**/*.test.tsx", "tests/templates/**/*.test.tsx"],
          setupFiles: ["tests/helpers/setup-dom.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/helpers/setup-node.ts"],
          globalSetup: ["tests/helpers/global-setup.ts"],
          // Integration tests share one database and truncate between tests, so
          // they must not run in parallel across files.
          fileParallelism: false,
        },
      },
    ],
  },
});
