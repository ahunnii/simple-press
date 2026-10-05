import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { keyToPublicUrl } from "~/lib/s3/url";

import { createTestCaller } from "../helpers/caller";
import { resetDb } from "../helpers/db";
import {
  createBusiness,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

/**
 * Media Library cross-tenant surface.
 *
 * `platformMedia.*` (the platform hub) takes an explicit `businessId`, so the
 * guards that tie a key to that business are the whole security story:
 *
 * - only a PLATFORM_ADMIN reaches any procedure (live DB role read);
 * - the business must exist;
 * - every key must live under `${businessId}/` — a foreign key is FORBIDDEN
 *   and S3 is never touched.
 *
 * The shop `media.*` router lost its old platform-admin `businessId` override:
 * a `businessId` in its input is stripped by zod, so even a platform admin on a
 * shop host can only act on that host's business.
 *
 * Every rejection is paired with a positive control so a broken procedure
 * (bad input, missing flag, unresolvable business) can't pass for the wrong
 * reason. S3 is mocked; the usage scan runs against the real test DB.
 */

const reqHost = vi.hoisted(() => ({ value: "media-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const s3 = vi.hoisted(() => ({
  listBusinessObjects: vi.fn(),
  deleteStoredObjects: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
}));
vi.mock("~/lib/s3/list", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/s3/list")>()),
  listBusinessObjects: (...args: unknown[]): unknown =>
    s3.listBusinessObjects(...args),
}));
vi.mock("~/lib/s3/delete", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/s3/delete")>()),
  deleteStoredObjects: (...args: unknown[]): unknown =>
    s3.deleteStoredObjects(...args),
}));
vi.mock("~/lib/s3/presign", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/s3/presign")>()),
  getPresignedDownloadUrl: (...args: unknown[]): unknown =>
    s3.getPresignedDownloadUrl(...args),
}));

async function expectTrpcError(
  promise: Promise<unknown>,
  code: TRPCError["code"],
  message?: string,
) {
  const error = await promise.then(
    () => null,
    (err: unknown) => err,
  );
  expect(error).toBeInstanceOf(TRPCError);
  expect((error as TRPCError).code).toBe(code);
  if (message) expect((error as TRPCError).message).toBe(message);
}

async function setup() {
  const bizA = await createBusiness({ subdomain: "media-a" });
  const bizB = await createBusiness({ subdomain: "media-b" });
  const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
  const ownerA = await createOwnerUser(bizA.id);
  return {
    bizA,
    bizB,
    admin,
    ownerA,
    adminCaller: createTestCaller({
      userId: admin.id,
      platformRole: "PLATFORM_ADMIN",
    }),
    ownerCaller: createTestCaller({ userId: ownerA.id }),
  };
}

describe("platformMedia — cross-tenant guards", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "media-a.simplepress.test";
    s3.listBusinessObjects.mockReset().mockResolvedValue([]);
    s3.deleteStoredObjects.mockReset().mockResolvedValue(undefined);
    s3.getPresignedDownloadUrl
      .mockReset()
      .mockResolvedValue("https://signed.example/x");
  });

  it("rejects delete of a key outside `${businessId}/` with FORBIDDEN", async () => {
    const { bizA, bizB, adminCaller } = await setup();

    await expectTrpcError(
      adminCaller.platformMedia.delete({
        businessId: bizA.id,
        key: `${bizB.id}/library-deadbeef.jpg`,
      }),
      "FORBIDDEN",
      "Key does not belong to the target business.",
    );
    expect(s3.deleteStoredObjects).not.toHaveBeenCalled();

    // A prefix that merely STARTS with the id (no slash) is foreign too.
    await expectTrpcError(
      adminCaller.platformMedia.delete({
        businessId: bizA.id,
        key: `${bizA.id}x/library-deadbeef.jpg`,
      }),
      "FORBIDDEN",
    );
    expect(s3.deleteStoredObjects).not.toHaveBeenCalled();

    // Positive control: the same caller deleting an unused key of bizA.
    const ownKey = `${bizA.id}/library-deadbeef.jpg`;
    await expect(
      adminCaller.platformMedia.delete({ businessId: bizA.id, key: ownKey }),
    ).resolves.toEqual({ success: true });
    expect(s3.deleteStoredObjects).toHaveBeenCalledWith([
      keyToPublicUrl(ownKey),
    ]);
  }, 15_000);

  it("fails a whole bulkDelete batch containing one foreign key", async () => {
    const { bizA, bizB, adminCaller } = await setup();

    await expectTrpcError(
      adminCaller.platformMedia.bulkDelete({
        businessId: bizA.id,
        keys: [`${bizA.id}/library-aaaa.jpg`, `${bizB.id}/library-bbbb.jpg`],
      }),
      "FORBIDDEN",
    );
    expect(s3.deleteStoredObjects).not.toHaveBeenCalled();

    // Positive control.
    const result = await adminCaller.platformMedia.bulkDelete({
      businessId: bizA.id,
      keys: [`${bizA.id}/library-aaaa.jpg`],
    });
    expect(result.deletedCount).toBe(1);
  }, 15_000);

  it("refuses to presign a foreign key", async () => {
    const { bizA, bizB, adminCaller } = await setup();

    await expectTrpcError(
      adminCaller.platformMedia.getDownloadUrl({
        businessId: bizA.id,
        key: `${bizB.id}/library-bbbb.jpg`,
      }),
      "FORBIDDEN",
    );
    expect(s3.getPresignedDownloadUrl).not.toHaveBeenCalled();

    await expect(
      adminCaller.platformMedia.getDownloadUrl({
        businessId: bizA.id,
        key: `${bizA.id}/library-aaaa.jpg`,
      }),
    ).resolves.toEqual({ url: "https://signed.example/x" });
  }, 15_000);

  it("returns NOT_FOUND for an unknown business before touching S3", async () => {
    const { adminCaller } = await setup();

    await expectTrpcError(
      adminCaller.platformMedia.list({ businessId: "no-such-business" }),
      "NOT_FOUND",
    );
    await expectTrpcError(
      adminCaller.platformMedia.delete({
        businessId: "no-such-business",
        key: "no-such-business/library-aaaa.jpg",
      }),
      "NOT_FOUND",
    );
    expect(s3.listBusinessObjects).not.toHaveBeenCalled();
    expect(s3.deleteStoredObjects).not.toHaveBeenCalled();
  }, 15_000);

  it("is platform-admin only — a business OWNER gets FORBIDDEN", async () => {
    const { bizA, ownerCaller, adminCaller } = await setup();

    await expectTrpcError(
      ownerCaller.platformMedia.list({ businessId: bizA.id }),
      "FORBIDDEN",
      "Platform admin access required",
    );
    await expectTrpcError(
      ownerCaller.platformMedia.delete({
        businessId: bizA.id,
        key: `${bizA.id}/library-aaaa.jpg`,
      }),
      "FORBIDDEN",
      "Platform admin access required",
    );
    expect(s3.deleteStoredObjects).not.toHaveBeenCalled();

    // Unauthenticated → UNAUTHORIZED.
    await expectTrpcError(
      createTestCaller({}).platformMedia.list({ businessId: bizA.id }),
      "UNAUTHORIZED",
    );

    // Positive control: the platform admin lists the same business.
    const listed = await adminCaller.platformMedia.list({
      businessId: bizA.id,
    });
    expect(listed.businessId).toBe(bizA.id);
    expect(s3.listBusinessObjects).toHaveBeenCalledWith(bizA.id);
  }, 15_000);

  it("trusts the live DB role, not the session's cached platformRole", async () => {
    const { bizA, ownerA } = await setup();
    // Session CLAIMS platform admin, DB says business user.
    const spoofed = createTestCaller({
      userId: ownerA.id,
      platformRole: "PLATFORM_ADMIN",
    });
    await expectTrpcError(
      spoofed.platformMedia.list({ businessId: bizA.id }),
      "FORBIDDEN",
    );
  });

  it("reports the business's media flag without gating on it", async () => {
    const { adminCaller } = await setup();
    const flagOff = await createBusiness({
      subdomain: "media-off",
      featureFlags: { media: false },
    });

    const off = await adminCaller.platformMedia.list({
      businessId: flagOff.id,
    });
    expect(off.mediaEnabled).toBe(false);
    expect(off.items).toEqual([]);

    const suspended = await createBusiness({
      subdomain: "media-suspended",
      status: "suspended",
    });
    const on = await adminCaller.platformMedia.list({
      businessId: suspended.id,
    });
    expect(on.mediaEnabled).toBe(true);
  }, 15_000);
});

describe("shop media — no cross-business override", () => {
  beforeEach(async () => {
    await resetDb();
    s3.deleteStoredObjects.mockReset().mockResolvedValue(undefined);
  });

  it("ignores a businessId in the input, even from a platform admin", async () => {
    const { bizA, bizB, adminCaller } = await setup();
    reqHost.value = "media-a.simplepress.test";

    // The old override would have retargeted bizB; now `businessId` is
    // stripped and the key is checked against the HOST's business (bizA).
    await expectTrpcError(
      adminCaller.media.delete({
        key: `${bizB.id}/library-bbbb.jpg`,
        businessId: bizB.id,
      } as { key: string }),
      "FORBIDDEN",
      "Key does not belong to the target business.",
    );
    expect(s3.deleteStoredObjects).not.toHaveBeenCalled();

    // Positive control: the host's own key.
    await expect(
      adminCaller.media.delete({ key: `${bizA.id}/library-aaaa.jpg` }),
    ).resolves.toEqual({ success: true });
  }, 15_000);
});
