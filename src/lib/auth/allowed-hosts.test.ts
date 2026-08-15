import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/env", () => ({
  env: {
    NEXT_PUBLIC_PLATFORM_DOMAIN: "simplepress.test",
  },
}));

const findMany = vi.fn();

vi.mock("~/server/db", () => ({
  db: {
    business: {
      findMany,
    },
  },
}));

describe("allowedHosts sync", () => {
  beforeEach(async () => {
    vi.resetModules();
    findMany.mockReset();
  });

  it("appends ACTIVE custom domains onto the shared allowlist", async () => {
    findMany.mockResolvedValueOnce([
      { customDomain: "Shop.Example.com" },
      { customDomain: "shop.example.com" },
      { customDomain: "other.org" },
    ]);

    const { allowedHosts, syncAllowedHostsFromDb, PLATFORM_ALLOWED_HOSTS } =
      await import("./allowed-hosts");

    expect(allowedHosts).toEqual([...PLATFORM_ALLOWED_HOSTS]);

    await syncAllowedHostsFromDb(true);

    expect(allowedHosts).toEqual([
      ...PLATFORM_ALLOWED_HOSTS,
      "shop.example.com",
      "other.org",
    ]);
  });
});
