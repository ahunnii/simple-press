import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBusinessByDomain } from "./domain";

// NEXT_PUBLIC_PLATFORM_DOMAIN is "simplepress.test" (tests/helpers/test-env.ts),
// so "bloom.simplepress.test" is a platform subdomain host and any other host
// is a custom domain.

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));
vi.mock("~/server/db", () => ({
  db: {
    business: {
      findUnique: (...args: unknown[]): unknown => dbMocks.findUnique(...args),
      findFirst: (...args: unknown[]): unknown => dbMocks.findFirst(...args),
    },
  },
}));

describe("getBusinessByDomain", () => {
  beforeEach(() => {
    dbMocks.findUnique.mockReset();
    dbMocks.findFirst.mockReset();
  });

  it("looks up platform subdomain hosts by subdomain, active stores only", async () => {
    dbMocks.findUnique.mockResolvedValue({ id: "biz_1" });

    const result = await getBusinessByDomain("bloom.simplepress.test");

    expect(result).toEqual({ id: "biz_1" });
    expect(dbMocks.findFirst).not.toHaveBeenCalled();
    const arg = dbMocks.findUnique.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where).toEqual({ subdomain: "bloom", status: "active" });
  });

  it("looks up custom-domain hosts (with and without port), active stores only", async () => {
    dbMocks.findFirst.mockResolvedValue({ id: "biz_2" });

    const result = await getBusinessByDomain("shop.florist.com:3000");

    expect(result).toEqual({ id: "biz_2" });
    expect(dbMocks.findUnique).not.toHaveBeenCalled();
    const arg = dbMocks.findFirst.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(arg.where).toEqual({
      status: "active",
      OR: [
        { customDomain: "shop.florist.com:3000" },
        { customDomain: "shop.florist.com" },
      ],
    });
  });

  it("returns null when no active store matches (unknown, suspended or closed)", async () => {
    dbMocks.findUnique.mockResolvedValue(null);
    dbMocks.findFirst.mockResolvedValue(null);

    await expect(
      getBusinessByDomain("gone.simplepress.test"),
    ).resolves.toBeNull();
    await expect(getBusinessByDomain("gone.florist.com")).resolves.toBeNull();
  });
});
