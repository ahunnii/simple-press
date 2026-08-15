// app/api/cron/route.ts
//
// Platform cron endpoint. Runs periodic maintenance jobs (human-readable list
// below; the `JOBS` array further down in this file is the source of truth —
// this comment can drift, that array can't):
//   1. staleReservations   — release "active" inventory reservations past their expiresAt
//   2. scheduledProducts   — publish products whose scheduledPublishAt has arrived
//   3. scheduledPages      — publish pages/blog posts whose scheduledPublishAt has arrived
//   4. backInStock         — email shoppers whose requested product/variant is purchasable again
//   5. archivePastEvents   — flip isArchived on events whose end (or start) has passed
//   6. videoSync           — pull YouTube channel/playlist feeds into the Video cache
//
// Auth: requires `Authorization: Bearer $CRON_SECRET` (env.CRON_SECRET). If the
// secret is unset, the endpoint always returns 401 — and logs a one-time
// console.warn + Sentry warning-level message so the misconfiguration (and
// the resulting silent loss of all scheduled jobs) is observable.
//
// Schedule it externally (system crontab, Coolify scheduled task, etc.), e.g.:
//   */15 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<platform-domain>/api/cron
//
// Each job runs in its own try/catch — one failing job never blocks the others.
// Failures are reported to Sentry (tag `cron.job`) and reflected in the JSON
// summary: { "<job>": { ok: boolean, count: number } }.
import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { getBusinessUrl } from "~/lib/business-url";
import { sendBackInStockEmail } from "~/lib/email/templates";
import { archivePastEvents } from "~/lib/events/archive";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { sweepStaleReservations } from "~/lib/inventory/reservation";
import { parseCardAdditionalFields } from "~/lib/products";
import { syncVideoSources } from "~/lib/youtube/sync";
import { db } from "~/server/db";

// Fires at most once per server process — CRON_SECRET being unset means every
// scheduled job (stale-reservation sweep, scheduled publish, back-in-stock
// emails) silently never runs, which is easy to miss since the endpoint just
// returns a routine-looking 401. This makes the misconfiguration loud without
// spamming Sentry/logs on every cron tick (typically every few minutes).
let missingSecretWarned = false;

function warnMissingCronSecret(): void {
  if (missingSecretWarned) return;
  missingSecretWarned = true;

  const message =
    "CRON_SECRET is not set — /api/cron is rejecting all requests, so " +
    "scheduled jobs (stale-reservation sweep, scheduled publish, back-in-stock " +
    "emails, past-event archiving, YouTube video sync) are silently never " +
    "running. Set CRON_SECRET to enable the cron endpoint.";
  console.warn(message);
  Sentry.captureMessage(message, {
    level: "warning",
    tags: { "cron.job": "auth-config" },
  });
}

function isAuthorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) {
    warnMissingCronSecret();
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  // Hash both sides so timingSafeEqual never throws on length mismatch.
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const provided = createHash("sha256").update(header).digest();
  return timingSafeEqual(expected, provided);
}

type JobResult = { ok: boolean; count: number };

async function runJob(
  name: string,
  fn: () => Promise<number>,
): Promise<JobResult> {
  try {
    const count = await fn();
    return { ok: true, count };
  } catch (err) {
    Sentry.captureException(err, { tags: { "cron.job": name } });
    return { ok: false, count: 0 };
  }
}

// Publish products whose scheduledPublishAt has arrived.
async function publishScheduledProducts(): Promise<number> {
  const res = await db.product.updateMany({
    where: { published: false, scheduledPublishAt: { lte: new Date() } },
    data: { published: true, scheduledPublishAt: null },
  });
  return res.count;
}

// Publish scheduled pages/blog posts. Pages without a publishedAt get
// one set to now — storefront blog listings coalesce
// publishedAt ?? createdAt for display/sort, so the visible date
// matches the actual publish time.
async function publishScheduledPages(): Promise<number> {
  const now = new Date();
  const withoutDate = await db.page.updateMany({
    where: {
      published: false,
      scheduledPublishAt: { lte: now },
      publishedAt: null,
    },
    data: { published: true, scheduledPublishAt: null, publishedAt: now },
  });
  const withDate = await db.page.updateMany({
    where: {
      published: false,
      scheduledPublishAt: { lte: now },
      publishedAt: { not: null },
    },
    data: { published: true, scheduledPublishAt: null },
  });
  return withoutDate.count + withDate.count;
}

// Back-in-stock notifications: email pending requests whose target
// product/variant is purchasable again. Semantics mirror the storefront
// `isInStock` helper (src/hooks/use-shop-filters.ts) plus the checkout
// validation's `comingSoon` guard. Per-request try/catch — a failed send
// leaves notifiedAt null so it retries on the next run. Requests whose
// product/variant no longer exists are retired (notifiedAt set) without an
// email. Requests for a business with the backInStock feature flag disabled
// are skipped (not retired) so they resume automatically if the flag is
// re-enabled.
async function notifyBackInStock(): Promise<number> {
  const requests = await db.backInStockRequest.findMany({
    where: { notifiedAt: null },
    orderBy: { createdAt: "asc" },
    take: 300,
  });
  if (requests.length === 0) return 0;

  const productIds = [...new Set(requests.map((r) => r.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      businessId: true,
      published: true,
      trackInventory: true,
      allowBackorders: true,
      inventoryQty: true,
      additionalFields: true,
      baseInventoryUnit: {
        select: { inventoryQty: true, allowBackorders: true },
      },
      variants: { select: { id: true, name: true, inventoryQty: true } },
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const businessIds = [...new Set(products.map((p) => p.businessId))];
  const businesses = await db.business.findMany({
    where: { id: { in: businessIds } },
    select: {
      id: true,
      name: true,
      ownerEmail: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      featureFlags: true,
      siteContent: { select: { logoUrl: true } },
    },
  });
  const businessMap = new Map(businesses.map((b) => [b.id, b]));
  // Cron requests arrive on the platform host, so the host-based
  // featureGate middleware can't resolve a business here — resolve each
  // business's flags directly instead.
  const backInStockEnabledMap = new Map(
    businesses.map((b) => [
      b.id,
      resolveFlags(b.featureFlags).isEnabled("backInStock"),
    ]),
  );

  type RestockProduct = (typeof products)[number];
  type RestockVariant = RestockProduct["variants"][number];

  const isPurchasable = (
    product: RestockProduct,
    variant: RestockVariant | null,
  ): boolean => {
    if (!product.published) return false;
    // Coming-soon products are blocked at checkout even with inventory.
    if (parseCardAdditionalFields(product.additionalFields)?.comingSoon)
      return false;
    if (!product.trackInventory) return true;
    if (product.allowBackorders) return true;
    if (product.baseInventoryUnit) {
      return (
        product.baseInventoryUnit.allowBackorders ||
        product.baseInventoryUnit.inventoryQty > 0
      );
    }
    if (variant) return variant.inventoryQty > 0;
    if (product.variants.length > 0) {
      return product.variants.some((v) => v.inventoryQty > 0);
    }
    return (product.inventoryQty ?? 0) > 0;
  };

  let sent = 0;
  for (const request of requests) {
    try {
      const product = productMap.get(request.productId);
      const variant = request.variantId
        ? (product?.variants.find((v) => v.id === request.variantId) ?? null)
        : null;
      const business = product
        ? businessMap.get(product.businessId)
        : undefined;

      // Product (or its requested variant, or its business) is gone —
      // retire the request so it doesn't retry forever.
      if (!product || !business || (request.variantId && !variant)) {
        await db.backInStockRequest.update({
          where: { id: request.id },
          data: { notifiedAt: new Date() },
        });
        continue;
      }

      // Feature disabled for this business — skip without retiring, so
      // notifications resume automatically if backInStock is re-enabled.
      if (!backInStockEnabledMap.get(business.id)) continue;

      // Still not purchasable — leave pending for a future run.
      if (!isPurchasable(product, variant)) continue;

      const emailResult = await sendBackInStockEmail({
        to: request.email,
        productName: product.name,
        variantName: variant?.name,
        productUrl: `${getBusinessUrl(business)}/shop/${product.slug}`,
        business,
      });

      // `sendEmail` never throws — it returns { success: false } — so the
      // catch below cannot stop us here, and stamping notifiedAt anyway
      // would retire the request forever: the shopper asked to be told the
      // item was back, the email never left, and no future run would ever
      // retry them. Leaving notifiedAt null is the whole retry mechanism.
      // The failure itself is already reported from inside sendEmail
      // (tagged service: resend, email.type: back_in_stock).
      if (!emailResult.success) continue;

      await db.backInStockRequest.update({
        where: { id: request.id },
        data: { notifiedAt: new Date() },
      });
      sent++;
    } catch (err) {
      // Failed send: notifiedAt stays null, retried next run.
      Sentry.captureException(err, {
        tags: { "cron.job": "back-in-stock" },
        extra: { requestId: request.id, productId: request.productId },
      });
    }
  }
  return sent;
}

type CronJob = {
  /** camelCase key in the JSON response summary — the shape callers see. */
  key: string;
  /** kebab-case Sentry `cron.job` tag value. Both names are load-bearing. */
  name: string;
  run: () => Promise<number>;
};

// Order matters: jobs run sequentially, top to bottom, exactly as before.
// The closing check-in derives its completeness check from this array's
// length, so adding a job here is the whole registration.
const JOBS: readonly CronJob[] = [
  // Release stale inventory reservations (platform-wide).
  {
    key: "staleReservations",
    name: "stale-reservations",
    run: () => sweepStaleReservations(db, { take: 500 }),
  },
  {
    key: "scheduledProducts",
    name: "scheduled-products",
    run: publishScheduledProducts,
  },
  {
    key: "scheduledPages",
    name: "scheduled-pages",
    run: publishScheduledPages,
  },
  {
    key: "backInStock",
    name: "back-in-stock",
    run: notifyBackInStock,
  },
  // Archive past events (admin Upcoming/Past split only — never
  // load-bearing for hiding a past event from the storefront). Platform-
  // wide, not feature-flag-gated; see archivePastEvents' docblock for why.
  {
    key: "archivePastEvents",
    name: "archive-past-events",
    run: () => archivePastEvents(db),
  },
  // YouTube video sync: refresh the `Video` metadata cache from each
  // registered channel/playlist Atom feed. Per-business `videos` flag
  // gating and per-source error isolation live inside `syncVideoSources`.
  //
  // This endpoint ticks every ~15 minutes, but a source is only eligible
  // once its lastSyncedAt is older than MIN_SYNC_INTERVAL_MS (30 min).
  // That guard is what stops us re-fetching every registered feed on every
  // tick and hammering YouTube — so most ticks are a single cheap SELECT.
  //
  // Sync is insert/update only: videos aging out of the ~15-entry feed
  // window are never deleted locally.
  {
    key: "videoSync",
    name: "video-sync",
    run: () => syncVideoSources(db),
  },
];

// Sentry Cron monitor slug for this endpoint. Deliberately matches the
// Coolify Scheduled Task name (`platform-cron`, docs/operations/cron-coolify.md)
// so the two are greppable together.
//
// The per-job `Sentry.captureException` calls inside `runJob` only fire when
// this endpoint is actually invoked. They cover "a job broke" but not "the
// scheduler stopped calling us at all" (Coolify Scheduled Task deleted,
// container down, CRON_SECRET rotated out from under it) — that failure mode
// is otherwise totally silent, since the endpoint just returns a
// routine-looking 401 or is never hit. This check-in is the dead-man's
// switch for that case. One monitor for the whole endpoint, not six —
// per-job signal is already covered by the `cron.job` tag on captureException.
const CRON_MONITOR_SLUG = "platform-cron";

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Preview deployments run this same NODE_ENV=production build against a
  // clone of production, but have no Coolify Scheduled Task pointed at them —
  // nothing ever calls /api/cron there. Without this gate, preview would
  // flap "missed check-in" against the *same* monitor slug forever, since
  // Sentry can't tell preview and production check-ins apart. Only the real
  // scheduled deployment reports in.
  //
  // The in_progress check-in goes after the auth guard on purpose: an
  // unauthorized probe (bad/rotated CRON_SECRET, a stray curl) must never
  // count as a run, or a rotated secret would keep the monitor looking
  // healthy while every job silently stops.
  const monitoringEnabled = !env.IS_PREVIEW_ENV;
  const startedAt = Date.now();
  const checkInId = monitoringEnabled
    ? Sentry.captureCheckIn(
        { monitorSlug: CRON_MONITOR_SLUG, status: "in_progress" },
        {
          schedule: { type: "crontab", value: "*/15 * * * *" },
          // Allowed drift (minutes) after the expected tick before Sentry
          // considers the check-in missed — a little slack for scheduler
          // jitter and endpoint latency.
          checkinMargin: 5,
          // Allowed in_progress duration (minutes) before Sentry considers
          // the run stuck/timed out, independent of whether we ever send a
          // closing check-in.
          maxRuntime: 10,
          timezone: "Etc/UTC",
          // Don't page on one blip: require 2 consecutive bad check-ins
          // (missed, timed out, or explicit "error") before opening an
          // issue, and 1 good one to resolve it.
          failureIssueThreshold: 2,
          recoveryThreshold: 1,
        },
      )
    : undefined;

  const results: Record<string, JobResult> = {};

  // Everything below is try/finally rather than a plain sequence so the
  // closing check-in still fires even if something throws outside of
  // runJob's own try/catch (a bug before the first job, say) — that
  // shouldn't leave the check-in stuck at "in_progress" until maxRuntime
  // times it out. runJob itself never throws (it catches and returns
  // { ok: false }), so in the expected case this finally is just where the
  // summary check-in lives.
  try {
    for (const job of JOBS) {
      results[job.key] = await runJob(job.name, job.run);
    }
  } finally {
    if (monitoringEnabled && checkInId) {
      const jobs = Object.values(results);
      // Derived from JOBS rather than hardcoded — the loop above populates
      // exactly one results entry per registered job, in order, so a
      // complete run always has jobs.length === JOBS.length.
      const allRan = jobs.length === JOBS.length;
      // Status is derived from the results map, not from whether this block
      // threw: runJob swallows every job failure into { ok: false } and
      // this handler always returns 200, so a plain try/catch here would
      // report a green check-in on a run where every single job failed.
      // Reading `results` instead makes the check-in reflect what actually
      // happened. (The `finally` still separately catches an unexpected
      // throw outside any runJob — see comment above the try.)
      const allOk = jobs.every((r) => r.ok);
      Sentry.captureCheckIn({
        monitorSlug: CRON_MONITOR_SLUG,
        checkInId,
        status: allRan && allOk ? "ok" : "error",
        duration: (Date.now() - startedAt) / 1000,
      });
    }

    // captureCheckIn/captureException only queue envelopes; a Coolify deploy
    // can kill the container between the 200 and transport drain. Bounded so
    // a slow transport can't hold the response.
    await Sentry.flush(2000);
  }

  return NextResponse.json(results);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
