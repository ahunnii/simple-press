import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { IndexNowChangedRows } from "~/lib/seo/indexnow-urls";
import type { DbClient } from "~/server/db";
import { env } from "~/env";
import { getCanonicalBaseUrl } from "~/lib/canonical";
import { resolveFlags } from "~/lib/features/resolve-flags";
import {
  collectChangedUrls,
  INDEXNOW_MAX_URLS,
  seedUrls,
} from "~/lib/seo/indexnow-urls";
import { isSeoRouteEnabled } from "~/lib/seo/sitemap-entries";
import { loadSitemapRows } from "~/server/seo/sitemap-rows";

/**
 * IndexNow cron sweep — tells Bing/Yandex/etc. which storefront URLs changed
 * so they recrawl within minutes instead of days.
 *
 * Per store, a watermark (`Business.indexNowSubmittedAt`) records the start of
 * the last successful submission; the next sweep submits published rows with
 * `updatedAt` after it. The first submission (null watermark) — or any sweep
 * after the store's canonical host changed (`Business.indexNowHost`, e.g. a
 * custom domain just went ACTIVE) — seeds the full sitemap instead, so a
 * domain verification re-seeds with no hooks in the domain routers.
 *
 * One platform key (`env.INDEXNOW_KEY`) serves every tenant: it is published
 * at `<canonical base>/indexnow-key.txt` (`src/app/indexnow-key.txt/route.ts`).
 */

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_TIMEOUT_MS = 10_000;
const DEFAULT_SWEEP_LIMIT = 25;
const SENTRY_JOB_TAG = "indexnow";

type FetchImpl = typeof fetch;

export interface IndexNowSubmission {
  host: string;
  keyLocation: string;
  urlList: string[];
}

/** POST one URL batch to IndexNow. Throws on network error or timeout. */
export async function submitIndexNow(
  { fetchImpl, key }: { fetchImpl: FetchImpl; key: string },
  { host, keyLocation, urlList }: IndexNowSubmission,
): Promise<{ status: number }> {
  const res = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation, urlList }),
    signal: AbortSignal.timeout(INDEXNOW_TIMEOUT_MS),
  });
  return { status: res.status };
}

export interface RunIndexNowSweepOptions {
  fetchImpl?: FetchImpl;
  /** Max businesses per sweep (default 25). */
  limit?: number;
  now?: () => Date;
}

/**
 * Submit changed URLs for up to `limit` active, non-maintenance stores,
 * oldest watermark first. Returns how many stores' watermarks advanced.
 *
 * - 200/202 → watermark advances to this store's sweep start (rows edited
 *   mid-sweep are picked up next time).
 * - 429/403 → one Sentry event and the whole sweep stops: the endpoint is
 *   throttling us or rejecting the key, and every later store would hit the
 *   same wall.
 * - anything else (other non-2xx, timeout, DB error) → Sentry warning, the
 *   watermark stays, and the sweep moves on to the next store.
 */
export async function runIndexNowSweep(
  db: DbClient,
  opts: RunIndexNowSweepOptions = {},
): Promise<number> {
  const key = env.INDEXNOW_KEY;
  if (!key || env.IS_PREVIEW_ENV || env.NODE_ENV !== "production") return 0;

  const fetchImpl = opts.fetchImpl ?? fetch;
  const limit = opts.limit ?? DEFAULT_SWEEP_LIMIT;
  const now = opts.now ?? (() => new Date());

  const businesses = await db.business.findMany({
    where: { status: "active", maintenanceMode: false },
    orderBy: { indexNowSubmittedAt: { sort: "asc", nulls: "first" } },
    take: limit,
    select: {
      id: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      featureFlags: true,
      updatedAt: true,
      indexNowSubmittedAt: true,
      indexNowHost: true,
    },
  });

  let advanced = 0;

  for (const business of businesses) {
    const sweepStart = now();
    let status: number | undefined;

    try {
      const baseUrl = getCanonicalBaseUrl(business);
      const host = new URL(baseUrl).host;
      const { isEnabled } = resolveFlags(business.featureFlags);
      const since = business.indexNowSubmittedAt;

      const urlList =
        since === null || business.indexNowHost !== host
          ? seedUrls({
              baseUrl,
              isEnabled,
              rows: await loadSitemapRows(db, business.id, isEnabled),
            })
          : collectChangedUrls({
              baseUrl,
              isEnabled,
              rows: await loadChangedRows(db, business, since, isEnabled),
            });

      if (urlList.length > 0) {
        ({ status } = await submitIndexNow(
          { fetchImpl, key },
          { host, keyLocation: `${baseUrl}/indexnow-key.txt`, urlList },
        ));

        if (status === 429 || status === 403) {
          Sentry.captureMessage(
            status === 429
              ? "IndexNow rate-limited the sweep (429); stopping until the next cron run"
              : "IndexNow rejected the key (403); check INDEXNOW_KEY and /indexnow-key.txt",
            {
              level: status === 429 ? "warning" : "error",
              tags: { "cron.job": SENTRY_JOB_TAG, status: String(status) },
              extra: { businessId: business.id, host },
            },
          );
          break;
        }

        if (status !== 200 && status !== 202) {
          Sentry.captureMessage("IndexNow submission failed", {
            level: "warning",
            tags: { "cron.job": SENTRY_JOB_TAG, status: String(status) },
            extra: { businessId: business.id, host, urls: urlList.length },
          });
          continue;
        }
      }

      // Raw SQL on purpose: a Prisma `update` would bump the @updatedAt
      // `Business.updatedAt`, which `homeChanged` reads — the homepage would
      // then be resubmitted on every sweep forever.
      await db.$executeRaw`UPDATE "Business" SET "indexNowSubmittedAt" = ${sweepStart}, "indexNowHost" = ${host} WHERE "id" = ${business.id}`;
      advanced++;
    } catch (err) {
      Sentry.captureException(err, {
        level: "warning",
        tags: {
          "cron.job": SENTRY_JOB_TAG,
          ...(status !== undefined ? { status: String(status) } : {}),
        },
        extra: { businessId: business.id },
      });
    }
  }

  return advanced;
}

/**
 * Published rows changed since the watermark, per enabled route. Visibility
 * filters mirror the public storefront queries — never submit a draft.
 */
async function loadChangedRows(
  db: DbClient,
  business: { id: string; updatedAt: Date },
  since: Date,
  isEnabled: (key: string) => boolean,
): Promise<IndexNowChangedRows> {
  const businessId = business.id;
  const changed = { gt: since };
  const slugSelect = { slug: true } as const;
  const take = INDEXNOW_MAX_URLS;
  const none = <T>() => Promise.resolve<T[]>([]);

  const [
    products,
    collections,
    pages,
    services,
    events,
    faq,
    testimonial,
    video,
    siteContent,
  ] = await Promise.all([
    isSeoRouteEnabled(isEnabled, "shop")
      ? db.product.findMany({
          where: { businessId, published: true, updatedAt: changed },
          select: slugSelect,
          take,
        })
      : none<{ slug: string }>(),
    isSeoRouteEnabled(isEnabled, "collections")
      ? db.collection.findMany({
          where: { businessId, published: true, updatedAt: changed },
          select: slugSelect,
          take,
        })
      : none<{ slug: string }>(),
    // Always fetched — CMS pages have no flag; the blog flag is applied to
    // the blog-typed subset in `collectChangedUrls`.
    db.page.findMany({
      where: { businessId, published: true, updatedAt: changed },
      select: { slug: true, type: true },
      take,
    }),
    isSeoRouteEnabled(isEnabled, "services")
      ? db.service.findMany({
          where: { businessId, published: true, updatedAt: changed },
          select: slugSelect,
          take,
        })
      : none<{ slug: string }>(),
    isSeoRouteEnabled(isEnabled, "events")
      ? db.event.findMany({
          where: { businessId, published: true, updatedAt: changed },
          select: slugSelect,
          take,
        })
      : none<{ slug: string }>(),
    // FAQ has no governing flag (same as the sitemap).
    db.faqItem.findFirst({
      where: { businessId, published: true, updatedAt: changed },
      select: { id: true },
    }),
    isSeoRouteEnabled(isEnabled, "testimonials")
      ? db.testimonial.findFirst({
          where: {
            businessId,
            isApproved: true,
            isHidden: false,
            updatedAt: changed,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    // `createdAt`, not `updatedAt`: the YouTube sync touches every cached
    // video's updatedAt on each run, which would resubmit /videos forever.
    isSeoRouteEnabled(isEnabled, "videos")
      ? db.video.findFirst({
          where: { businessId, published: true, createdAt: changed },
          select: { id: true },
        })
      : Promise.resolve(null),
    db.siteContent.findUnique({
      where: { businessId },
      select: { updatedAt: true },
    }),
  ]);

  return {
    products,
    collections,
    pages,
    services,
    events,
    faqChanged: faq !== null,
    testimonialsChanged: testimonial !== null,
    videosAdded: video !== null,
    homeChanged:
      business.updatedAt > since ||
      (siteContent !== null && siteContent.updatedAt > since),
  };
}
