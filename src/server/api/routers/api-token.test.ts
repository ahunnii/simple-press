import { describe, expect, it, vi } from "vitest";

import { API_TOKEN_LIST_SELECT } from "./api-token";

// Importing the router pulls in `../trpc` → the real better-auth singleton
// (see review.test.ts for why it's stubbed in the DB-less unit project).
vi.mock("~/server/better-auth", () => ({ auth: {} }));

describe("API_TOKEN_LIST_SELECT", () => {
  it("never selects the token hash", () => {
    const select = API_TOKEN_LIST_SELECT as Record<string, unknown>;
    expect(select.tokenHash).toBeUndefined();
    expect(select.id).toBe(true);
    expect(select.prefix).toBe(true);
  });
});
