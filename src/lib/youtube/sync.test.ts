/**
 * Sync-engine tests.
 *
 * The headline test here is "never writes owner-owned columns on update". It
 * deliberately asserts on the SHAPE OF THE `update` PAYLOAD handed to
 * `db.video.upsert`, not on a post-state, because the bug it guards against is
 * invisible in post-state terms: if someone "simplifies" the upsert by
 * spreading one payload object into both `create` and `update`, the resulting
 * writes are all perfectly valid — they just silently revert every owner edit,
 * unpublish, and manual ordering on the next cron tick. Only a shape assertion
 * fails loudly for that change.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ParsedFeedEntry } from "~/lib/youtube/feed";
import {
  MIN_SYNC_INTERVAL_MS,
  OWNER_OWNED_COLUMNS,
  syncOneSource,
  syncVideoSources,
} from "~/lib/youtube/sync";

vi.mock("~/lib/youtube/feed", () => ({
  fetchChannelFeed: vi.fn(),
  fetchPlaylistFeed: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const { fetchChannelFeed, fetchPlaylistFeed } =
  await import("~/lib/youtube/feed");
const mockChannelFeed = vi.mocked(fetchChannelFeed);
const mockPlaylistFeed = vi.mocked(fetchPlaylistFeed);

// ── fixtures ────────────────────────────────────────────────────────────────

type SourceRow = {
  id: string;
  kind: string;
  externalId: string;
  businessId: string;
  autoPublish: boolean;
  enabled: boolean;
  lastSyncedAt: Date | null;
};

type VideoRow = { businessId: string; youtubeId: string };

const NOW = new Date("2026-07-31T12:00:00.000Z");

function makeSource(overrides: Partial<SourceRow> = {}): SourceRow {
  return {
    id: "src_1",
    kind: "channel",
    externalId: "UCabcdefghijklmnopqrstuv",
    businessId: "biz_1",
    autoPublish: true,
    enabled: true,
    lastSyncedAt: null,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ParsedFeedEntry> = {}): ParsedFeedEntry {
  return {
    youtubeId: "dQw4w9WgXcQ",
    title: "A video",
    description: "A description",
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    channelTitle: "A channel",
    publishedAt: new Date("2026-07-30T00:00:00.000Z"),
    ...overrides,
  };
}

type UpsertArgs = {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

type SourceUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type SourceFindManyArgs = {
  where: {
    enabled: boolean;
    OR?: ({ lastSyncedAt: null } | { lastSyncedAt: { lt: Date } })[];
  };
  orderBy?: unknown;
  take?: number;
  select?: unknown;
};

type BusinessFindManyArgs = {
  where: { id: { in: string[] } };
  select?: unknown;
};

type VideoFindManyArgs = {
  where: { businessId: string; youtubeId: { in: string[] } };
  select?: unknown;
};

/**
 * A hand-rolled `db` double. `videoSource.findMany` genuinely applies the
 * `where`/`take` it's given, so the eligibility-window tests exercise the real
 * selection logic rather than just asserting on a query object.
 */
function makeDb(opts: {
  sources?: SourceRow[];
  businesses?: { id: string; featureFlags: unknown }[];
  existingVideos?: VideoRow[];
  maxSortOrder?: number | null;
}) {
  const sources = opts.sources ?? [];
  const businesses = opts.businesses ?? [
    { id: "biz_1", featureFlags: { videos: true } },
  ];
  const existingVideos = opts.existingVideos ?? [];

  const videoUpsert = vi.fn((_args: UpsertArgs) => Promise.resolve({}));
  const videoDelete = vi.fn();
  const videoDeleteMany = vi.fn();
  const sourceUpdate = vi.fn((_args: SourceUpdateArgs) => Promise.resolve({}));

  const videoAggregate = vi.fn((_args: { where: { businessId: string } }) =>
    Promise.resolve({ _max: { sortOrder: opts.maxSortOrder ?? null } }),
  );

  const sourceFindMany = vi.fn((args: SourceFindManyArgs) => {
    let rows = sources.filter((s) => s.enabled === args.where.enabled);

    if (args.where.OR) {
      let cutoff: Date | undefined;
      for (const clause of args.where.OR) {
        if (clause.lastSyncedAt) cutoff = clause.lastSyncedAt.lt;
      }
      rows = rows.filter(
        (s) =>
          s.lastSyncedAt === null ||
          (cutoff !== undefined && s.lastSyncedAt.getTime() < cutoff.getTime()),
      );
    }

    // nulls first, then stalest first — mirrors the `orderBy` under test.
    rows = [...rows].sort(
      (a, b) =>
        (a.lastSyncedAt?.getTime() ?? -Infinity) -
        (b.lastSyncedAt?.getTime() ?? -Infinity),
    );
    return Promise.resolve(rows.slice(0, args.take ?? rows.length));
  });

  const businessFindMany = vi.fn((args: BusinessFindManyArgs) =>
    Promise.resolve(businesses.filter((b) => args.where.id.in.includes(b.id))),
  );

  const videoFindMany = vi.fn((args: VideoFindManyArgs) =>
    Promise.resolve(
      existingVideos
        .filter(
          (v) =>
            v.businessId === args.where.businessId &&
            args.where.youtubeId.in.includes(v.youtubeId),
        )
        .map((v) => ({ youtubeId: v.youtubeId })),
    ),
  );

  const db = {
    videoSource: {
      findMany: sourceFindMany,
      findUnique: vi.fn((args: { where: { id: string } }) =>
        Promise.resolve(sources.find((s) => s.id === args.where.id) ?? null),
      ),
      update: sourceUpdate,
    },
    business: { findMany: businessFindMany },
    video: {
      findMany: videoFindMany,
      aggregate: videoAggregate,
      upsert: videoUpsert,
      delete: videoDelete,
      deleteMany: videoDeleteMany,
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    db: db as unknown as Parameters<typeof syncVideoSources>[0],
    upsertCalls: () => videoUpsert.mock.calls.map((c) => c[0]),
    sourceUpdateCalls: () => sourceUpdate.mock.calls.map((c) => c[0]),
    sourceFindMany,
    businessFindMany,
    videoAggregate,
    videoDelete,
    videoDeleteMany,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockChannelFeed.mockResolvedValue([]);
  mockPlaylistFeed.mockResolvedValue([]);
});

// ── THE INVARIANT ───────────────────────────────────────────────────────────

describe("the sync/owner column split", () => {
  it("updates sync-owned metadata and never writes an owner-owned column", async () => {
    // Existing row: the owner unpublished it, reordered it to 7, and wrote her
    // own title. Sync must refresh the YouTube metadata underneath all of that
    // without disturbing any of it.
    const source = makeSource({ autoPublish: true });
    const harness = makeDb({
      sources: [source],
      existingVideos: [{ businessId: "biz_1", youtubeId: "dQw4w9WgXcQ" }],
      maxSortOrder: 7,
    });

    mockChannelFeed.mockResolvedValue([
      makeEntry({ title: "New synced title" }),
    ]);

    await syncOneSource(harness.db, "src_1");

    const calls = harness.upsertCalls();
    expect(calls).toHaveLength(1);
    const update = calls[0]!.update;

    // The refresh happened…
    expect(update.title).toBe("New synced title");

    // …and nothing owner-owned rode along with it. Asserting on key PRESENCE
    // (not on values) is the point: `published: false` would be just as
    // catastrophic as `published: true` if the owner had published it.
    for (const column of OWNER_OWNED_COLUMNS) {
      expect(update).not.toHaveProperty(column);
    }

    // Belt-and-braces: the update payload is EXACTLY the five sync-owned
    // columns. Any new key at all fails here, including one nobody thought to
    // add to OWNER_OWNED_COLUMNS.
    expect(Object.keys(update).sort()).toEqual([
      "channelTitle",
      "description",
      "publishedAt",
      "thumbnailUrl",
      "title",
    ]);
  });

  it("does not reuse one payload object for create and update", async () => {
    const harness = makeDb({ sources: [makeSource()] });
    mockChannelFeed.mockResolvedValue([makeEntry()]);

    await syncOneSource(harness.db, "src_1");

    const call = harness.upsertCalls()[0]!;
    // Distinct objects, not two references to one — a shared reference is the
    // exact shape the "simplification" bug takes.
    expect(call.create).not.toBe(call.update);
    expect(Object.keys(call.create).length).toBeGreaterThan(
      Object.keys(call.update).length,
    );
  });

  it("targets the (businessId, youtubeId) unique, not (sourceId, youtubeId)", async () => {
    const harness = makeDb({ sources: [makeSource()] });
    mockChannelFeed.mockResolvedValue([makeEntry()]);

    await syncOneSource(harness.db, "src_1");

    expect(harness.upsertCalls()[0]!.where).toEqual({
      businessId_youtubeId: { businessId: "biz_1", youtubeId: "dQw4w9WgXcQ" },
    });
  });
});

// ── insert seeding ──────────────────────────────────────────────────────────

describe("create payload", () => {
  it.each([true, false])(
    "seeds published from source.autoPublish (%s)",
    async (autoPublish) => {
      const harness = makeDb({ sources: [makeSource({ autoPublish })] });
      mockChannelFeed.mockResolvedValue([makeEntry()]);

      await syncOneSource(harness.db, "src_1");

      const create = harness.upsertCalls()[0]!.create;
      expect(create.published).toBe(autoPublish);
      expect(create.sourceId).toBe("src_1");
      expect(create.businessId).toBe("biz_1");
      expect(create.youtubeId).toBe("dQw4w9WgXcQ");
    },
  );

  it("appends new videos after the business's current max sortOrder, incrementing locally", async () => {
    const harness = makeDb({ sources: [makeSource()], maxSortOrder: 4 });
    mockChannelFeed.mockResolvedValue([
      makeEntry({ youtubeId: "aaaaaaaaaaa" }),
      makeEntry({ youtubeId: "bbbbbbbbbbb" }),
      makeEntry({ youtubeId: "ccccccccccc" }),
    ]);

    await syncOneSource(harness.db, "src_1");

    expect(harness.upsertCalls().map((c) => c.create.sortOrder)).toEqual([
      5, 6, 7,
    ]);
    // Computed once, not re-queried per entry.
    expect(harness.videoAggregate).toHaveBeenCalledTimes(1);
  });

  it("starts sortOrder at 1 when the business has no videos yet", async () => {
    const harness = makeDb({ sources: [makeSource()], maxSortOrder: null });
    mockChannelFeed.mockResolvedValue([makeEntry()]);

    await syncOneSource(harness.db, "src_1");

    expect(harness.upsertCalls()[0]!.create.sortOrder).toBe(1);
  });

  it("does not burn a sortOrder slot on a video already in the table", async () => {
    const harness = makeDb({
      sources: [makeSource()],
      existingVideos: [{ businessId: "biz_1", youtubeId: "aaaaaaaaaaa" }],
      maxSortOrder: 9,
    });
    mockChannelFeed.mockResolvedValue([
      makeEntry({ youtubeId: "aaaaaaaaaaa" }),
      makeEntry({ youtubeId: "bbbbbbbbbbb" }),
    ]);

    const counts = await syncOneSource(harness.db, "src_1");

    expect(counts).toEqual({ added: 1, updated: 1 });
    expect(harness.upsertCalls()[1]!.create.sortOrder).toBe(10);
  });

  it("counts a video listed twice in one feed as a single add", async () => {
    const harness = makeDb({ sources: [makeSource()], maxSortOrder: 0 });
    mockChannelFeed.mockResolvedValue([makeEntry(), makeEntry()]);

    const counts = await syncOneSource(harness.db, "src_1");

    expect(counts).toEqual({ added: 1, updated: 1 });
  });
});

// ── feed dispatch ───────────────────────────────────────────────────────────

describe("feed dispatch", () => {
  it("uses the channel feed for kind=channel", async () => {
    const harness = makeDb({ sources: [makeSource({ kind: "channel" })] });
    await syncOneSource(harness.db, "src_1");

    expect(mockChannelFeed).toHaveBeenCalledWith("UCabcdefghijklmnopqrstuv");
    expect(mockPlaylistFeed).not.toHaveBeenCalled();
  });

  it("uses the playlist feed for kind=playlist", async () => {
    const harness = makeDb({
      sources: [makeSource({ kind: "playlist", externalId: "PLxyz" })],
    });
    await syncOneSource(harness.db, "src_1");

    expect(mockPlaylistFeed).toHaveBeenCalledWith("PLxyz");
    expect(mockChannelFeed).not.toHaveBeenCalled();
  });

  it("records an unknown kind as a sync error", async () => {
    const harness = makeDb({ sources: [makeSource({ kind: "vimeo" })] });

    await expect(syncOneSource(harness.db, "src_1")).rejects.toThrow(/vimeo/);
    expect(harness.sourceUpdateCalls()[0]!.data.lastSyncError).toMatch(/vimeo/);
  });
});

// ── empty feed: suspicious, but not destructive ─────────────────────────────

describe("empty feed", () => {
  it("is a clean success that deletes nothing", async () => {
    const harness = makeDb({
      sources: [makeSource()],
      existingVideos: [
        { businessId: "biz_1", youtubeId: "aaaaaaaaaaa" },
        { businessId: "biz_1", youtubeId: "bbbbbbbbbbb" },
      ],
    });
    mockChannelFeed.mockResolvedValue([]);

    const counts = await syncOneSource(harness.db, "src_1");

    expect(counts).toEqual({ added: 0, updated: 0 });
    // The ~15-entry feed window means "absent from the feed" says nothing about
    // whether a video still exists. Reconcile-by-delete would wipe the back
    // catalogue on the first sync of an established channel.
    expect(harness.videoDelete).not.toHaveBeenCalled();
    expect(harness.videoDeleteMany).not.toHaveBeenCalled();
    expect(harness.upsertCalls()).toHaveLength(0);

    const bookkeeping = harness.sourceUpdateCalls()[0]!;
    expect(bookkeeping.data.lastSyncError).toBeNull();
    expect(bookkeeping.data.lastSyncedAt).toBeInstanceOf(Date);
  });

  it("never deletes rows that dropped out of a non-empty feed either", async () => {
    const harness = makeDb({
      sources: [makeSource()],
      existingVideos: [
        { businessId: "biz_1", youtubeId: "olddddddddd" },
        { businessId: "biz_1", youtubeId: "aaaaaaaaaaa" },
      ],
    });
    // The feed only carries the recent one; the older row must survive.
    mockChannelFeed.mockResolvedValue([
      makeEntry({ youtubeId: "aaaaaaaaaaa" }),
    ]);

    await syncOneSource(harness.db, "src_1");

    expect(harness.videoDelete).not.toHaveBeenCalled();
    expect(harness.videoDeleteMany).not.toHaveBeenCalled();
  });
});

// ── failure bookkeeping ─────────────────────────────────────────────────────

describe("failure bookkeeping", () => {
  it("records lastSyncError and leaves lastSyncedAt untouched", async () => {
    const harness = makeDb({ sources: [makeSource()] });
    mockChannelFeed.mockRejectedValue(new Error("feed 404"));

    await expect(syncOneSource(harness.db, "src_1")).rejects.toThrow(
      "feed 404",
    );

    const calls = harness.sourceUpdateCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.where).toEqual({ id: "src_1" });
    expect(calls[0]!.data.lastSyncError).toBe("feed 404");
    // Critically: NOT bumped. A failed source must stay stale so the interval
    // guard re-picks it on the very next sweep instead of benching it 30 min.
    expect(calls[0]!.data).not.toHaveProperty("lastSyncedAt");
  });

  it("truncates a huge error message", async () => {
    const harness = makeDb({ sources: [makeSource()] });
    mockChannelFeed.mockRejectedValue(new Error("x".repeat(5000)));

    await expect(syncOneSource(harness.db, "src_1")).rejects.toThrow();

    const recorded = harness.sourceUpdateCalls()[0]!.data
      .lastSyncError as string;
    expect(recorded.length).toBeLessThanOrEqual(500);
    expect(recorded.endsWith("…")).toBe(true);
  });

  it("clears a previous error on the next successful run", async () => {
    const harness = makeDb({ sources: [makeSource()] });
    mockChannelFeed.mockResolvedValue([makeEntry()]);

    await syncOneSource(harness.db, "src_1");

    const data = harness.sourceUpdateCalls()[0]!.data;
    expect(Object.keys(data).sort()).toEqual(["lastSyncError", "lastSyncedAt"]);
    expect(data.lastSyncError).toBeNull();
    expect(data.lastSyncedAt).toBeInstanceOf(Date);
  });

  it("throws when the source does not exist", async () => {
    const harness = makeDb({ sources: [] });
    await expect(syncOneSource(harness.db, "nope")).rejects.toThrow(/nope/);
  });
});

// ── cron sweep: selection, gating, isolation ────────────────────────────────

describe("syncVideoSources", () => {
  it("excludes a source synced inside MIN_SYNC_INTERVAL_MS", async () => {
    const recent = makeSource({
      id: "src_recent",
      lastSyncedAt: new Date(NOW.getTime() - (MIN_SYNC_INTERVAL_MS - 60_000)),
    });
    const stale = makeSource({
      id: "src_stale",
      lastSyncedAt: new Date(NOW.getTime() - (MIN_SYNC_INTERVAL_MS + 60_000)),
    });
    const harness = makeDb({ sources: [recent, stale] });
    mockChannelFeed.mockResolvedValue([makeEntry()]);

    await syncVideoSources(harness.db, { now: NOW });

    // Only the stale one was fetched and bookkept.
    expect(mockChannelFeed).toHaveBeenCalledTimes(1);
    expect(harness.sourceUpdateCalls().map((c) => c.where.id)).toEqual([
      "src_stale",
    ]);
  });

  it("includes a never-synced source and orders it first", async () => {
    const never = makeSource({ id: "src_never", lastSyncedAt: null });
    const stale = makeSource({
      id: "src_stale",
      lastSyncedAt: new Date(NOW.getTime() - 10 * MIN_SYNC_INTERVAL_MS),
    });
    const harness = makeDb({ sources: [stale, never] });

    await syncVideoSources(harness.db, { now: NOW });

    expect(harness.sourceUpdateCalls().map((c) => c.where.id)).toEqual([
      "src_never",
      "src_stale",
    ]);
  });

  it("only selects enabled sources, stalest first, capped by take", async () => {
    const harness = makeDb({
      sources: [
        makeSource({ id: "a" }),
        makeSource({ id: "b" }),
        makeSource({ id: "c", enabled: false }),
      ],
    });

    await syncVideoSources(harness.db, { now: NOW, take: 1 });

    const findManyArgs = harness.sourceFindMany.mock.calls[0]![0];
    expect(findManyArgs.where.enabled).toBe(true);
    expect(findManyArgs.take).toBe(1);
    expect(findManyArgs.orderBy).toEqual({
      lastSyncedAt: { sort: "asc", nulls: "first" },
    });
    expect(harness.sourceUpdateCalls()).toHaveLength(1);
  });

  it("skips a business with the videos flag off without touching its lastSyncedAt", async () => {
    const harness = makeDb({
      sources: [
        makeSource({ id: "src_on", businessId: "biz_on" }),
        makeSource({ id: "src_off", businessId: "biz_off" }),
      ],
      businesses: [
        { id: "biz_on", featureFlags: { videos: true } },
        { id: "biz_off", featureFlags: { videos: false } },
      ],
    });
    mockChannelFeed.mockResolvedValue([makeEntry()]);

    await syncVideoSources(harness.db, { now: NOW });

    // The flagged-off source was never fetched…
    expect(mockChannelFeed).toHaveBeenCalledTimes(1);
    // …and, crucially, never bookkept. Bumping lastSyncedAt for a skipped
    // source would bench it for 30 minutes after the flag is re-enabled.
    const touched = harness.sourceUpdateCalls().map((c) => c.where.id);
    expect(touched).toEqual(["src_on"]);
  });

  it("treats a business with no stored flags as videos-off (registry default)", async () => {
    const harness = makeDb({
      sources: [makeSource()],
      businesses: [{ id: "biz_1", featureFlags: null }],
    });

    await syncVideoSources(harness.db, { now: NOW });

    // `videos` is enabledByDefault: false in the feature registry.
    expect(mockChannelFeed).not.toHaveBeenCalled();
    expect(harness.sourceUpdateCalls()).toHaveLength(0);
  });

  it("isolates a failing source so the rest of the batch still runs", async () => {
    const harness = makeDb({
      sources: [
        makeSource({ id: "src_bad", externalId: "UCbad" }),
        makeSource({ id: "src_good", externalId: "UCgood" }),
      ],
    });
    mockChannelFeed.mockImplementation((channelId: string) =>
      channelId === "UCbad"
        ? Promise.reject(new Error("boom"))
        : Promise.resolve([makeEntry()]),
    );

    const total = await syncVideoSources(harness.db, { now: NOW });

    expect(total).toBe(1);
    const calls = harness.sourceUpdateCalls();
    expect(calls.find((c) => c.where.id === "src_bad")!.data).toEqual({
      lastSyncError: "boom",
    });
    expect(
      calls.find((c) => c.where.id === "src_good")!.data.lastSyncError,
    ).toBe(null);
  });

  it("returns the total of added + updated across sources", async () => {
    const harness = makeDb({
      sources: [makeSource({ id: "a" }), makeSource({ id: "b" })],
      existingVideos: [{ businessId: "biz_1", youtubeId: "aaaaaaaaaaa" }],
    });
    mockChannelFeed.mockResolvedValue([
      makeEntry({ youtubeId: "aaaaaaaaaaa" }), // update
      makeEntry({ youtubeId: "bbbbbbbbbbb" }), // add
    ]);

    // 2 per source × 2 sources.
    expect(await syncVideoSources(harness.db, { now: NOW })).toBe(4);
  });

  it("short-circuits when nothing is eligible", async () => {
    const harness = makeDb({ sources: [] });

    expect(await syncVideoSources(harness.db, { now: NOW })).toBe(0);
    expect(harness.businessFindMany).not.toHaveBeenCalled();
  });
});
