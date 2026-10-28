import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MaterialPolicyUpdate } from "~/lib/legal/material-updates";
import { resolvePolicyUpdateNotice } from "~/lib/legal/policy-update-notice.server";

const findUser = vi.fn<(args: unknown) => Promise<unknown>>();
const hasAcknowledged =
  vi.fn<(args: Record<string, unknown>) => Promise<boolean | undefined>>();

vi.mock("~/server/db", () => ({
  db: { user: { findUnique: (args: unknown) => findUser(args) } },
}));
vi.mock("~/lib/legal/policy-acceptance.server", () => ({
  hasAcknowledged: (args: Record<string, unknown>) => hasAcknowledged(args),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const MERCHANT: MaterialPolicyUpdate = {
  id: "2027-01-merchant-fees",
  documents: ["merchant"],
  announcedOn: "2027-01-05",
  effectiveOn: "2027-02-05",
  summary: "We changed our fees.",
};
const BOTH: MaterialPolicyUpdate = {
  ...MERCHANT,
  id: "2027-01-both",
  documents: ["merchant", "platform"],
};
const NOW = new Date("2027-01-10T15:00:00.000Z");

const base = {
  membershipRole: "OWNER" as string | null,
  userId: "u1",
  businessId: "b1",
  merchantTermsVersion: "2026-10-11" as string | null | undefined,
  now: NOW,
};

beforeEach(() => {
  findUser.mockReset().mockResolvedValue({ termsVersion: "2026-10-11" });
  hasAcknowledged.mockReset().mockResolvedValue(false);
});

describe("resolvePolicyUpdateNotice", () => {
  it("shows a pending notice to an owner who has not acknowledged", async () => {
    const result = await resolvePolicyUpdateNotice({
      ...base,
      updates: [MERCHANT],
    });
    expect(result).toEqual({ update: MERCHANT, pending: true });
    expect(hasAcknowledged).toHaveBeenCalledWith({
      userId: "u1",
      bundle: "merchant",
      version: MERCHANT.id,
      businessId: "b1",
    });
  });

  it("is not pending once the effective date has passed", async () => {
    const result = await resolvePolicyUpdateNotice({
      ...base,
      now: new Date("2027-03-01T15:00:00.000Z"),
      updates: [MERCHANT],
    });
    expect(result).toEqual({ update: MERCHANT, pending: false });
  });

  it.each([["MANAGER"], ["STAFF"], [null]])(
    "never shows for role %s",
    async (membershipRole) => {
      expect(
        await resolvePolicyUpdateNotice({
          ...base,
          membershipRole,
          updates: [MERCHANT],
        }),
      ).toBeNull();
      expect(hasAcknowledged).not.toHaveBeenCalled();
    },
  );

  it("shows nothing when no update is announced yet", async () => {
    expect(
      await resolvePolicyUpdateNotice({
        ...base,
        now: new Date("2027-01-01T15:00:00.000Z"),
        updates: [MERCHANT],
      }),
    ).toBeNull();
    expect(
      await resolvePolicyUpdateNotice({ ...base, updates: [] }),
    ).toBeNull();
  });

  it("skips owners whose clickwrap postdates the announcement", async () => {
    expect(
      await resolvePolicyUpdateNotice({
        ...base,
        merchantTermsVersion: "2027-01-05",
        updates: [MERCHANT],
      }),
    ).toBeNull();
    expect(hasAcknowledged).not.toHaveBeenCalled();
  });

  it("skips owners who already pressed Got it", async () => {
    hasAcknowledged.mockResolvedValue(true);
    expect(
      await resolvePolicyUpdateNotice({ ...base, updates: [MERCHANT] }),
    ).toBeNull();
  });

  it("fails open when the version column is unknown", async () => {
    expect(
      await resolvePolicyUpdateNotice({
        ...base,
        merchantTermsVersion: undefined,
        updates: [MERCHANT],
      }),
    ).toBeNull();
  });

  it("fails open when the log cannot be read", async () => {
    hasAcknowledged.mockResolvedValue(undefined);
    expect(
      await resolvePolicyUpdateNotice({ ...base, updates: [MERCHANT] }),
    ).toBeNull();
  });

  it("fails open when a lookup throws", async () => {
    findUser.mockRejectedValue(new Error("boom"));
    expect(
      await resolvePolicyUpdateNotice({ ...base, updates: [BOTH] }),
    ).toBeNull();
  });

  it("covers each bundle independently", async () => {
    // Merchant bundle covered by a post-announcement clickwrap, platform bundle
    // acknowledged via the log → nothing left to ask.
    hasAcknowledged.mockImplementation(({ bundle }) =>
      Promise.resolve(bundle === "platform"),
    );
    expect(
      await resolvePolicyUpdateNotice({
        ...base,
        merchantTermsVersion: "2027-01-06",
        updates: [BOTH],
      }),
    ).toBeNull();

    // Platform clickwrap covers platform, merchant still needs the ack.
    hasAcknowledged.mockResolvedValue(false);
    findUser.mockResolvedValue({ termsVersion: "2027-01-06" });
    expect(
      await resolvePolicyUpdateNotice({ ...base, updates: [BOTH] }),
    ).toMatchObject({ update: BOTH });
  });

  it("treats a platform-only update as the user's termsVersion question", async () => {
    const platformOnly: MaterialPolicyUpdate = {
      ...MERCHANT,
      id: "2027-01-privacy",
      documents: ["platform"],
    };
    findUser.mockResolvedValue({ termsVersion: null });
    expect(
      await resolvePolicyUpdateNotice({
        ...base,
        merchantTermsVersion: undefined, // irrelevant to a platform-only update
        updates: [platformOnly],
      }),
    ).toMatchObject({ update: platformOnly });
    expect(hasAcknowledged).toHaveBeenCalledWith({
      userId: "u1",
      bundle: "platform",
      version: platformOnly.id,
      businessId: undefined,
    });
  });
});
