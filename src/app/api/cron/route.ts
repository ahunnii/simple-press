// app/api/cron/route.ts
//
// Platform cron endpoint. Runs periodic maintenance jobs:
//   1. staleReservations   — release "active" inventory reservations past their expiresAt
//   2. scheduledProducts   — publish products whose scheduledPublishAt has arrived
//   3. scheduledPages      — publish pages/blog posts whose scheduledPublishAt has arrived
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
import { sweepStaleReservations } from "~/lib/inventory/reservation";
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

  return NextResponse.json(results);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
