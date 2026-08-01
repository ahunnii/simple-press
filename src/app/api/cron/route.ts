// app/api/cron/route.ts
//
// Platform cron endpoint. Runs periodic maintenance jobs:
//   1. staleReservations   — release "active" inventory reservations past their expiresAt
//   2. scheduledProducts   — publish products whose scheduledPublishAt has arrived
//   3. scheduledPages      — publish pages/blog posts whose scheduledPublishAt has arrived
//   4. backInStock         — email shoppers whose requested product/variant is purchasable again
//   5. archivePastEvents   — flip isArchived on events whose end (or start) has passed
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
    "emails, past-event archiving) are silently never running. Set CRON_SECRET " +
    "to enable the cron endpoint.";
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

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, JobResult> = {};

  // 1. Release stale inventory reservations (platform-wide).
  results.staleReservations = await runJob("stale-reservations", () =>
    sweepStaleReservations(db, { take: 500 }),
  );

  // 2. Publish scheduled products.
  results.scheduledProducts = await runJob("scheduled-products", async () => {
    const res = await db.product.updateMany({
      where: { published: false, scheduledPublishAt: { lte: new Date() } },
      data: { published: true, scheduledPublishAt: null },
    });
    return res.count;
  });

  // 3. Publish scheduled pages/blog posts. Pages without a publishedAt get one
  //    set to now — storefront blog listings coalesce publishedAt ?? createdAt
  //    for display/sort, so the visible date matches the actual publish time.
  results.scheduledPages = await runJob("scheduled-pages", async () => {
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
  });

  // 4. Back-in-stock notifications: email pending requests whose target
  //    product/variant is purchasable again. Semantics mirror the storefront
  //    `isInStock` helper (src/hooks/use-shop-filters.ts) plus the checkout
  //    validation's `comingSoon` guard. Per-request try/catch — a failed send
  //    leaves notifiedAt null so it retries on the next run. Requests whose
  //    product/variant no longer exists are retired (notifiedAt set) without
  //    an email. Requests for a business with the backInStock feature flag
  //    disabled are skipped (not retired) so they resume automatically if
  //    the flag is re-enabled.
  results.backInStock = await runJob("back-in-stock", async () => {
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

        await sendBackInStockEmail({
          to: request.email,
          productName: product.name,
          variantName: variant?.name,
          productUrl: `${getBusinessUrl(business)}/shop/${product.slug}`,
          business,
        });

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
  });

  // 5. Archive past events (admin Upcoming/Past split only — never load-bearing
  //    for hiding a past event from the storefront). Platform-wide, not
  //    feature-flag-gated; see archivePastEvents' docblock for why.
  results.archivePastEvents = await runJob("archive-past-events", () =>
    archivePastEvents(db),
  );

  return NextResponse.json(results);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
