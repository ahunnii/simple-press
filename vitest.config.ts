import { defineConfig } from "vitest/config";

// PR 1: pure unit tests only (node env, no DB/jsdom). PR 2 extends this into
// projects (node + happy-dom) for DB-integration and component tests.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
