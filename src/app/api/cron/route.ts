// app/api/cron/route.ts
//
// Platform cron endpoint. Runs periodic maintenance jobs:
//   1. staleReservations   — release "active" inventory reservations past their expiresAt
//   2. scheduledProducts   — publish products whose scheduledPublishAt has arrived
//   3. scheduledPages      — publish pages/blog posts whose scheduledPublishAt has arrived
//   4. backInStock         — email shoppers whose requested product/variant is purchasable again
//
// Auth: requires `Authorization: Bearer $CRON_SECRET` (env.CRON_SECRET). If the
// secret is unset, the endpoint always returns 401.
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
import { sweepStaleReservations } from "~/lib/inventory/reservation";
import { parseCardAdditionalFields } from "~/lib/products";
import { db } from "~/server/db";

function isAuthorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false;

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
  //    an email.
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
        siteContent: { select: { logoUrl: true } },
      },
    });
    const businessMap = new Map(businesses.map((b) => [b.id, b]));

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

  return NextResponse.json(results);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
