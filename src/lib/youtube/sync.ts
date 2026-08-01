/**
 * YouTube feed → `Video` table sync engine.
 *
 * Driven by two callers:
 *   - the admin "Sync now" button (`syncOneSource`), and
 *   - the platform cron sweep (`syncVideoSources`, job #6 in
 *     `src/app/api/cron/route.ts`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE INVARIANT THIS MODULE EXISTS TO PROTECT
 * ────────────────────────────────────────────────────────────────────────────
 * `Video` is a cache of YouTube metadata with owner overrides layered on top.
 * It has two writers with strictly disjoint column sets (see the `Video`
 * docblock in `prisma/schema.prisma`):
 *
 *   SYNC-OWNED   title, description, thumbnailUrl, channelTitle, publishedAt
 *                → rewritten by this module on EVERY run.
 *   OWNER-OWNED  titleOverride, descriptionOverride, thumbnailOverride,
 *                published, sortOrder (and sourceId)
 *                → seeded by this module at first insert, then owned by the
 *                  admin UI forever after.
 *
 * The upsert's `update` clause therefore lists ONLY the sync-owned columns.
 * Widening it — most temptingly by building one payload object and spreading it
 * into both `create` and `update` — silently destroys owner data: a video the
 * owner unpublished reappears on her public storefront 30 minutes later, her
 * custom titles revert, her manual ordering resets. Nothing throws, no
 * constraint is violated, and no test fails by construction. That is why the
 * two payloads are produced by two separate, separately-typed builders below,
 * and why `sync.test.ts` asserts on the *shape of the update payload* rather
 * than on post-state.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SYNC IS INSERT/UPDATE ONLY — IT NEVER DELETES
 * ────────────────────────────────────────────────────────────────────────────
 * A YouTube Atom feed carries only the ~15 most recent entries. Videos falling
 * out of that window is normal, not a removal signal. Reconciling by deleting
 * local rows absent from the feed would wipe an established channel's entire
 * back catalogue on the very first sync. Rows leave `Video` only by explicit
 * owner action in the admin UI.
 */
import * as Sentry from "@sentry/nextjs";

import type { ParsedFeedEntry } from "~/lib/youtube/feed";
import type { DbClient } from "~/server/db";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { fetchChannelFeed, fetchPlaylistFeed } from "~/lib/youtube/feed";

/**
 * Minimum age of `lastSyncedAt` before a source is eligible for another sweep.
 *
 * The cron endpoint ticks every ~15 minutes; this guard is what keeps us from
 * re-fetching every registered feed on every tick and hammering YouTube.
 */
export const MIN_SYNC_INTERVAL_MS = 30 * 60 * 1000;

/** Default number of sources one cron sweep will process. */
export const DEFAULT_SYNC_BATCH = 50;

/** `lastSyncError` is a display field, not a log — keep it bounded. */
const MAX_SYNC_ERROR_LENGTH = 500;

/**
 * Owner-owned columns. Listed here (and exported) so `sync.test.ts` can assert
 * that none of them ever appear in an upsert's `update` payload.
 */
export const OWNER_OWNED_COLUMNS = [
  "titleOverride",
  "descriptionOverride",
  "thumbnailOverride",
  "published",
  "sortOrder",
  // Not strictly owner-*edited*, but equally off-limits to `update`: a video
  // added by hand has `sourceId: null`, and adopting it into a feed would
  // change what deleting that feed does to it (SetNull → the owner's manual
  // entry would survive, vs. staying manual either way).
  "sourceId",
] as const;

export type OwnerOwnedColumn = (typeof OWNER_OWNED_COLUMNS)[number];

/**
 * Exactly the sync-owned columns — nothing else may ever be added here.
 *
 * This type is the load-bearing compile-time guard: it is the declared return
 * type of `buildSyncUpdate`, so TypeScript's excess-property check rejects an
 * object literal that carries any owner-owned key.
 */
type SyncOwnedFields = {
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  publishedAt: Date;
};

/** The subset of `VideoSource` the sync actually needs. */
type SyncableSource = {
  id: string;
  kind: string;
  externalId: string;
  businessId: string;
  autoPublish: boolean;
};

const SOURCE_SELECT = {
  id: true,
  kind: true,
  externalId: true,
  businessId: true,
  autoPublish: true,
} as const;

export type SyncCounts = { added: number; updated: number };

/**
 * The ONLY payload ever handed to an upsert's `update` clause.
 *
 * Do not inline this into the upsert, do not merge it with the insert payload,
 * and do not add a field to it that isn't sync-owned. See the module docblock.
 */
function buildSyncUpdate(entry: ParsedFeedEntry): SyncOwnedFields {
  return {
    title: entry.title,
    description: entry.description,
    thumbnailUrl: entry.thumbnailUrl,
    channelTitle: entry.channelTitle,
    publishedAt: entry.publishedAt,
  };
}

/**
 * The payload for a row that does not exist yet. This is the one and only
 * moment the sync is allowed to write owner-owned columns: `published` is
 * seeded from the source's `autoPublish`, `sortOrder` is appended to the end of
 * the business's list. Both belong to the owner from here on.
 */
function buildInsertPayload(
  entry: ParsedFeedEntry,
  source: SyncableSource,
  sortOrder: number,
) {
  return {
    businessId: source.businessId,
    youtubeId: entry.youtubeId,
    sourceId: source.id,
    // Sync-owned, at insert.
    title: entry.title,
    description: entry.description,
    thumbnailUrl: entry.thumbnailUrl,
    channelTitle: entry.channelTitle,
    publishedAt: entry.publishedAt,
    // Owner-owned — seeded here, never written again.
    published: source.autoPublish,
    sortOrder,
  };
}

function truncateSyncError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const message = raw.trim() || "Unknown sync error";
  return message.length > MAX_SYNC_ERROR_LENGTH
    ? `${message.slice(0, MAX_SYNC_ERROR_LENGTH - 1)}…`
    : message;
}

function fetchFeedFor(source: SyncableSource): Promise<ParsedFeedEntry[]> {
  if (source.kind === "channel") return fetchChannelFeed(source.externalId);
  if (source.kind === "playlist") return fetchPlaylistFeed(source.externalId);
  return Promise.reject(new Error(`Unknown video source kind: ${source.kind}`));
}

/**
 * Sync a single already-loaded source row.
 *
 * Success → `lastSyncedAt = now`, `lastSyncError = null`.
 * Failure → `lastSyncError` set, `lastSyncedAt` left UNCHANGED so the interval
 *           guard in `syncVideoSources` retries it on the very next sweep
 *           instead of benching it for 30 minutes, then rethrows so the caller
 *           (admin button / per-source catch) can react.
 *
 * An empty feed is a success, not a failure — a channel can legitimately have
 * no public uploads, and the feed module returns `[]` rather than throwing on
 * transport errors too. Either way we record a clean run and touch nothing.
 */
async function syncSourceRow(
  db: DbClient,
  source: SyncableSource,
): Promise<SyncCounts> {
  try {
    const entries = await fetchFeedFor(source);

    let added = 0;
    let updated = 0;

    if (entries.length > 0) {
      // Which of these videos does the business already have? Answers both
      // "is this an insert or an update?" (for the counts) and "does it need a
      // sortOrder?" in one query instead of one per entry.
      const existing = await db.video.findMany({
        where: {
          businessId: source.businessId,
          youtubeId: { in: entries.map((e) => e.youtubeId) },
        },
        select: { youtubeId: true },
      });
      const known = new Set(existing.map((v) => v.youtubeId));

      // Append new videos after everything the business already has. Computed
      // once and incremented locally — not re-queried per entry.
      const maxSortOrder = await db.video.aggregate({
        where: { businessId: source.businessId },
        _max: { sortOrder: true },
      });
      let nextSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1;

      for (const entry of entries) {
        const isNew = !known.has(entry.youtubeId);

        await db.video.upsert({
          where: {
            businessId_youtubeId: {
              businessId: source.businessId,
              youtubeId: entry.youtubeId,
            },
          },
          // ── `create` and `update` are built by two SEPARATE functions, and
          // that separation is deliberate and load-bearing. `create` seeds the
          // owner-owned columns (published, sortOrder, sourceId) exactly once;
          // `update` carries ONLY the five sync-owned columns. Merging them —
          // e.g. `const data = {...}; create: data, update: data` — would make
          // every cron tick silently revert the owner's unpublishes, custom
          // titles, and manual ordering, with no error and no failing test.
          // See the module docblock and the `Video` docblock in schema.prisma.
          create: buildInsertPayload(entry, source, nextSortOrder),
          update: buildSyncUpdate(entry),
        });

        if (isNew) {
          nextSortOrder++;
          added++;
          // A single feed can list the same video twice; count and number it
          // once so the second occurrence is treated as the update it is.
          known.add(entry.youtubeId);
        } else {
          updated++;
        }
      }
    }

    await db.videoSource.update({
      where: { id: source.id },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });

    return { added, updated };
  } catch (err) {
    // Best-effort bookkeeping: if the DB itself is what failed, this write will
    // fail too, and the original error is what matters.
    try {
      await db.videoSource.update({
        where: { id: source.id },
        // NOTE: no `lastSyncedAt` here, on purpose — a failed source stays
        // stale so the next sweep picks it up immediately.
        data: { lastSyncError: truncateSyncError(err) },
      });
    } catch {
      // swallow — rethrowing the original below is more useful
    }
    throw err;
  }
}

/**
 * Sync one source on demand (the admin "Sync now" button).
 *
 * Throws if the source doesn't exist, and rethrows feed/DB failures after
 * recording them on the source, so the caller can surface the failure.
 */
export async function syncOneSource(
  db: DbClient,
  sourceId: string,
): Promise<SyncCounts> {
  const source = await db.videoSource.findUnique({
    where: { id: sourceId },
    select: SOURCE_SELECT,
  });
  if (!source) throw new Error(`Video source not found: ${sourceId}`);

  return syncSourceRow(db, source);
}

/**
 * Platform-wide cron sweep. Returns the total number of videos added + updated.
 *
 * Selects enabled sources that have never synced or whose last sync is older
 * than `MIN_SYNC_INTERVAL_MS`, stalest first, capped at `take`.
 */
export async function syncVideoSources(
  db: DbClient,
  opts: { take?: number; now?: Date } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - MIN_SYNC_INTERVAL_MS);

  const sources = await db.videoSource.findMany({
    where: {
      enabled: true,
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: cutoff } }],
    },
    // Stalest first; never-synced sources sort ahead of everything.
    orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
    take: opts.take ?? DEFAULT_SYNC_BATCH,
    select: SOURCE_SELECT,
  });
  if (sources.length === 0) return 0;

  // Cron requests arrive on the platform host, so the host-based `featureGate`
  // tRPC middleware can't resolve a business here — resolve each business's
  // flags directly instead. Same approach (and same reason) as the
  // `backInStock` job in `src/app/api/cron/route.ts`.
  const businessIds = [...new Set(sources.map((s) => s.businessId))];
  const businesses = await db.business.findMany({
    where: { id: { in: businessIds } },
    select: { id: true, featureFlags: true },
  });
  const videosEnabled = new Map(
    businesses.map((b) => [
      b.id,
      resolveFlags(b.featureFlags).isEnabled("videos"),
    ]),
  );

  let total = 0;
  for (const source of sources) {
    // Feature disabled for this business — skip WITHOUT touching lastSyncedAt,
    // so the source resumes on the next sweep if `videos` is re-enabled rather
    // than sitting out a 30-minute interval it never actually used.
    if (!videosEnabled.get(source.businessId)) continue;

    try {
      const { added, updated } = await syncSourceRow(db, source);
      total += added + updated;
    } catch (err) {
      // Already recorded on the source as `lastSyncError` (the owner-facing
      // surface); Sentry is the operator-facing one. One bad feed must never
      // block the rest of the batch.
      Sentry.captureException(err, {
        tags: { "youtube.sync": "source" },
        extra: {
          sourceId: source.id,
          businessId: source.businessId,
          kind: source.kind,
        },
      });
    }
  }

  return total;
}
