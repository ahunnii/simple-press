import { describe, expect, it, vi } from "vitest";

import type { TxClient } from "~/server/db";

import { runBulkSetPublished } from "./content";

// `content.ts` pulls in `../trpc`, which imports the real `auth` (better-auth)
// singleton from `~/server/better-auth`. Constructing that singleton eagerly
// kicks off `trustedOrigins()` (src/server/better-auth/config.tsx), which
// fires a real `db.business.findMany()` — an unhandled-rejection network call
// to Postgres the instant this test file is imported, DB or no DB. Stubbing
// the module keeps this file a pure unit test of `runBulkSetPublished`
// (below) without booting real auth or touching a database; `auth` itself is
// only ever referenced inside `createTRPCContext`'s body in trpc.ts, never at
// module load, so an empty stub is enough.
vi.mock("~/server/better-auth", () => ({ auth: {} }));

/**
 * `runBulkSetPublished` is the transactional body of `content.bulkSetPublished`
 * (see its docblock in `./content.ts` for the full double-count story), pulled
 * out so it can run here against a hand-rolled `tx` stand-in instead of a real
 * database. These are pure unit tests — no Docker, no DATABASE_URL traffic —
 * covering B3: publishing 3 never-published drafts used to report `count: 6`
 * because the two partitioned `updateMany` calls' results were summed, and the
 * second call's `publishedAt: { not: null }` filter re-matched the exact rows
 * the first call had just stamped a `publishedAt` onto. The fix derives
 * `count` from the pre-write `changed` read instead (the same read that
 * already produces `changedIds`, which Undo re-sends), so the two mocked
 * `updateMany` counts below are deliberately WRONG/misleading in several
 * tests — proving the final `count` no longer depends on them.
 */
function makeTx(opts: { changedIds: string[]; updateManyCounts?: number[] }) {
  const findMany = vi
    .fn()
    .mockResolvedValue(opts.changedIds.map((id) => ({ id })));
  let call = 0;
  const updateMany = vi.fn().mockImplementation(() => {
    const count = opts.updateManyCounts?.[call] ?? 0;
    call += 1;
    return Promise.resolve({ count });
  });
  // Cast rather than satisfy the full `Prisma.PageDelegate` shape —
  // `runBulkSetPublished` only ever calls `findMany`/`updateMany`, and this
  // mock's whole job is to observe exactly those two calls.
  const tx = { page: { findMany, updateMany } } as unknown as Pick<
    TxClient,
    "page"
  >;
  return { tx, findMany, updateMany };
}

describe("runBulkSetPublished", () => {
  it("publishing 3 never-published drafts reports count 3, not the double-counted 6", async () => {
    const { tx, updateMany } = makeTx({
      changedIds: ["a", "b", "c"],
      // Simulates the exact bug this replaces: the first updateMany
      // (publishedAt: null) matches and writes the 3 drafts (count 3); the
      // second (publishedAt: { not: null }) re-matches those SAME 3 rows on
      // the same connection, now that they have a publishedAt, and reports
      // them again (count 3) — summed, that was `count: 6`.
      updateManyCounts: [3, 3],
    });

    const result = await runBulkSetPublished(tx, {
      ids: ["a", "b", "c"],
      businessId: "biz_1",
      published: true,
      now: new Date("2026-08-13T00:00:00Z"),
    });

    expect(result.count).toBe(3);
    expect(result.changedIds).toEqual(["a", "b", "c"]);
    expect(updateMany).toHaveBeenCalledTimes(2);
  });

  it("mixed draft+republish selection counts only the drafts that actually flip", async () => {
    // Selection of 5: 3 fresh drafts + 2 already-published rows. Publishing
    // all 5 only actually flips the 3 drafts — the 2 already-published rows
    // stay published (their updateMany still runs, to clear a stray
    // scheduledPublishAt, but that isn't a `published` state change).
    const { tx } = makeTx({
      changedIds: ["draft-1", "draft-2", "draft-3"],
      updateManyCounts: [3, 2],
    });

    const result = await runBulkSetPublished(tx, {
      ids: ["draft-1", "draft-2", "draft-3", "pub-1", "pub-2"],
      businessId: "biz_1",
      published: true,
      now: new Date("2026-08-13T00:00:00Z"),
    });

    expect(result.count).toBe(3);
    expect(result.changedIds).toEqual(["draft-1", "draft-2", "draft-3"]);
  });

  it("issues both partitioned updateMany calls with the correct where/data shape when publishing", async () => {
    const { tx, updateMany } = makeTx({ changedIds: ["a"] });
    const now = new Date("2026-08-13T00:00:00Z");

    await runBulkSetPublished(tx, {
      ids: ["a", "b"],
      businessId: "biz_1",
      published: true,
      now,
    });

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: { in: ["a", "b"] },
        businessId: "biz_1",
        publishedAt: null,
      },
      data: { published: true, publishedAt: now, scheduledPublishAt: null },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: { in: ["a", "b"] },
        businessId: "biz_1",
        publishedAt: { not: null },
      },
      data: { published: true, scheduledPublishAt: null },
    });
  });

  it("unpublishing a mixed selection counts only the rows that actually flip, not every matched row", async () => {
    // Selection of 4: 2 already published (will flip to unpublished), 2
    // already unpublished (no-op). The single updateMany deliberately
    // doesn't filter on `published` (see the docblock in content.ts for why
    // — it must not disturb scheduledPublishAt semantics on untouched rows),
    // so its own `result.count` would be 4 if it were used directly.
    const { tx, updateMany } = makeTx({
      changedIds: ["pub-1", "pub-2"],
      updateManyCounts: [4],
    });

    const result = await runBulkSetPublished(tx, {
      ids: ["pub-1", "pub-2", "draft-1", "draft-2"],
      businessId: "biz_1",
      published: false,
      now: new Date("2026-08-13T00:00:00Z"),
    });

    expect(result.changedIds).toEqual(["pub-1", "pub-2"]);
    expect(result.count).toBe(2);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("scopes every query to the given businessId and id selection", async () => {
    const { tx, findMany } = makeTx({ changedIds: [] });

    await runBulkSetPublished(tx, {
      ids: ["x", "y"],
      businessId: "biz_42",
      published: false,
      now: new Date("2026-08-13T00:00:00Z"),
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["x", "y"] },
        businessId: "biz_42",
        published: { not: false },
      },
      select: { id: true },
    });
  });
});
