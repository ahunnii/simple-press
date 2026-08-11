/**
 * `isKnownCaptchaHost` is the tenant-isolation boundary that replaces
 * Google's (disabled) domain verification for our multi-tenant reCAPTCHA
 * site key. A false negative here locks real users out of sign-in; a false
 * positive lets a forged host mint trusted captcha verdicts for a tenant it
 * doesn't own. Both directions are tested explicitly.
 *
 * `~/server/db` is mocked so this runs without a database (unit project,
 * `pnpm test:nodb`). `businessHostFilter` (from `~/lib/domain-utils`) is
 * deliberately NOT mocked — the whole point of several cases here is to
 * prove the real subdomain/customDomain split holds through this call site,
 * not just in `domain-utils.test.ts`.
 *
 * NEXT_PUBLIC_PLATFORM_DOMAIN is "simplepress.test" (tests/helpers/test-env.ts).
 */
import { BusinessDomainStatus } from "generated/prisma";
import type { Mock } from "vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/db", () => ({
  db: { business: { findFirst: vi.fn() } },
}));

const { db } = await import("~/server/db");
const { isKnownCaptchaHost } = await import("./known-hosts");

// Cast away Prisma's real (heavily overloaded) delegate type — the mock only
// ever needs to report back a minimal `{ id }` row or `null`, and the point
// of these tests is the shape of the `where` clause passed in, not
// Prisma-level type fidelity.
const findFirst = db.business.findFirst as unknown as Mock<
  (args: {
    where: Record<string, unknown>;
    select?: unknown;
  }) => Promise<{ id: string } | null>
>;

afterEach(() => {
  findFirst.mockReset();
  vi.unstubAllEnvs();
});

describe("isKnownCaptchaHost — platform aliases (no Business row)", () => {
  it("accepts the bare platform apex", async () => {
    await expect(isKnownCaptchaHost("simplepress.test")).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("accepts mystore.<platform-domain> (middleware treats it as the platform domain)", async () => {
    await expect(
      isKnownCaptchaHost("mystore.simplepress.test"),
    ).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("accepts platform.<platform-domain> (the platform-admin subdomain)", async () => {
    await expect(
      isKnownCaptchaHost("platform.simplepress.test"),
    ).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("accepts preview.<platform-domain> (preview deployment alias)", async () => {
    await expect(
      isKnownCaptchaHost("preview.simplepress.test"),
    ).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("is case-insensitive and port-tolerant for the platform apex", async () => {
    await expect(
      isKnownCaptchaHost("SimplePress.Test:3000"),
    ).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });
});

describe("isKnownCaptchaHost — live tenant subdomain", () => {
  it("accepts a subdomain of an active business", async () => {
    findFirst.mockResolvedValueOnce({ id: "biz_1" });

    await expect(isKnownCaptchaHost("bloom.simplepress.test")).resolves.toBe(
      true,
    );

    expect(findFirst).toHaveBeenCalledTimes(1);
    const call = findFirst.mock.calls[0]?.[0];
    expect(call?.where).toEqual({ subdomain: "bloom", status: "active" });
  });

  it("rejects a subdomain whose business is not active", async () => {
    // The DB wouldn't return a row for `status: "active"` if the real
    // business is suspended/closed — simulate that by resolving null, and
    // assert the query actually constrains on status so this can't pass by
    // accident.
    findFirst.mockResolvedValueOnce(null);

    await expect(isKnownCaptchaHost("closed.simplepress.test")).resolves.toBe(
      false,
    );

    const call = findFirst.mock.calls[0]?.[0];
    expect(call?.where).toEqual({ subdomain: "closed", status: "active" });
  });
});

describe("isKnownCaptchaHost — custom domain", () => {
  it("accepts a custom domain that is ACTIVE on an active business", async () => {
    findFirst.mockResolvedValueOnce({ id: "biz_2" });

    await expect(isKnownCaptchaHost("bloom.florist.com")).resolves.toBe(true);

    expect(findFirst).toHaveBeenCalledTimes(1);
    const call = findFirst.mock.calls[0]?.[0];
    expect(call?.where).toEqual({
      customDomain: "bloom.florist.com",
      status: "active",
      domainStatus: BusinessDomainStatus.ACTIVE,
    });
  });

  it("rejects a custom domain that is only claimed (PENDING_DNS), not DNS-verified", async () => {
    // A PENDING_DNS row structurally cannot satisfy `domainStatus: ACTIVE`,
    // so the real DB returns null for this where-clause — simulate that, and
    // assert the query hard-codes the ACTIVE-only filter so a pending claim
    // can never mint a trusted token.
    findFirst.mockResolvedValueOnce(null);

    await expect(isKnownCaptchaHost("pending.florist.com")).resolves.toBe(
      false,
    );

    const call = findFirst.mock.calls[0]?.[0];
    expect(call?.where).toEqual({
      customDomain: "pending.florist.com",
      status: "active",
      domainStatus: BusinessDomainStatus.ACTIVE,
    });
  });

  it("never OR's a custom-domain lookup against subdomain — the cross-tenant hazard", async () => {
    // Regression for the exact bug documented at domain-utils.ts:40-48: a
    // request for `bloom.florist.com` (a custom domain that does not exist)
    // must NOT resolve some other tenant merely because that tenant's
    // *subdomain* happens to be "bloom". `bloom.florist.com` has 3 labels,
    // so extractSubdomain's endsWith(".simplepress.test") check correctly
    // fails and this is routed to the customDomain branch — but assert it
    // structurally, not just by return value, so a future OR-based rewrite
    // fails loudly here.
    findFirst.mockResolvedValueOnce(null);

    await expect(isKnownCaptchaHost("bloom.florist.com")).resolves.toBe(
      false,
    );

    expect(findFirst).toHaveBeenCalledTimes(1);
    const call = findFirst.mock.calls[0]?.[0];
    expect(call?.where).toHaveProperty("customDomain", "bloom.florist.com");
    expect(call?.where).not.toHaveProperty("subdomain");
  });
});

describe("isKnownCaptchaHost — unknown / malformed hosts", () => {
  it("rejects an entirely unknown host", async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(isKnownCaptchaHost("nowhere.example.com")).resolves.toBe(
      false,
    );
  });

  it("rejects an empty hostname without touching the database", async () => {
    await expect(isKnownCaptchaHost("")).resolves.toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("rejects a hostname that is only whitespace", async () => {
    await expect(isKnownCaptchaHost("   ")).resolves.toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });
});

describe("isKnownCaptchaHost — dev-only localhost", () => {
  it("accepts bare localhost when NODE_ENV=development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await expect(isKnownCaptchaHost("localhost:3000")).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("accepts a tenant subdomain of localhost when NODE_ENV=development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    await expect(isKnownCaptchaHost("demo.localhost:3000")).resolves.toBe(
      true,
    );
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("does NOT give localhost a free pass outside development", async () => {
    // NODE_ENV is "test" here (the Vitest default) — the localhost allowance
    // must not leak into any non-development build.
    findFirst.mockResolvedValueOnce(null);

    await expect(isKnownCaptchaHost("localhost:3000")).resolves.toBe(false);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
