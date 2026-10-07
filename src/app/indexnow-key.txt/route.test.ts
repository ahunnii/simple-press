import { beforeEach, describe, expect, it, vi } from "vitest";

let mockEnv: { INDEXNOW_KEY?: string } = {
  INDEXNOW_KEY: "abc123-def456-ghi789",
};

vi.mock("~/env", () => ({
  get env() {
    return mockEnv;
  },
}));

import { GET } from "./route";

describe("GET /indexnow-key.txt", () => {
  beforeEach(() => {
    mockEnv = { INDEXNOW_KEY: "abc123-def456-ghi789" };
  });

  it("returns 200 with key as text/plain when INDEXNOW_KEY is set", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(await res.text()).toBe("abc123-def456-ghi789");
  });

  it("returns 404 when INDEXNOW_KEY is unset", async () => {
    mockEnv = {};
    const res = await GET();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not found");
  });
});
