import type { MetricWindow, StatPart, StatQuery } from "./types";
import type { CardData, SeriesPoint } from "~/lib/dashboard/card-data";
import type { DashboardRangeGranularity } from "~/lib/dashboard/ranges";
import { unavailableCardData } from "~/lib/dashboard/card-data";
import { financeOrderScope } from "~/lib/finance/order-scope";
import {
  getConnectionStatus,
  getPageviewsSeries,
  getStats,
} from "~/lib/umami/client";

import { windowSeriesPoints } from "./series";

export type TrafficWidget = "visitors" | "conversion-rate";

/** Umami must answer inside this or the card degrades (no fake zero). */
const UMAMI_TIMEOUT_MS = 4000;

/** Thrown out of `trafficStat` so `index.ts` can return an unavailable card. */
export class TrafficUnavailableError extends Error {
  constructor(readonly card: CardData) {
    super("Dashboard traffic unavailable");
  }
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Umami timed out")), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

async function uniqueVisitors(
  websiteId: string,
  startAt: Date,
  endAt: Date,
): Promise<number> {
  const stats = await getStats({
    websiteId,
    startAt: startAt.getTime(),
    endAt: endAt.getTime(),
  });
  return stats.visitors;
}

/**
 * Umami's per-bucket `sessions` for the window, laid onto the same zero-filled
 * axis (keys and labels) as every other family (`windowSeriesPoints`).
 *
 * Umami returns each bucket's start as a store-local timestamp
 * ("2026-10-12 00:00:00", or the ISO form), so the first 10 (day) or 7
 * (month) characters ARE the bucket key. Distinct sessions per bucket is
 * Umami's visitors-per-bucket, so the buckets can add up to more than the
 * headline (the same person on two days counts once in the headline).
 *
 * Returns undefined when the series can't be had: `getPageviewsSeries` turns
 * a failed request into empty arrays, so "no sessions at all while the
 * window HAS visitors" is read as a failure, not as a flat zero line. A
 * timeout or throw is also undefined. The headline never depends on this.
 */
async function visitorSeries(
  websiteId: string,
  win: MetricWindow,
  startAt: Date,
  headline: Promise<number>,
  opts: { granularity: DashboardRangeGranularity; timeZone: string },
): Promise<SeriesPoint[] | undefined> {
  try {
    const [raw, visitors] = await Promise.all([
      withTimeout(
        getPageviewsSeries({
          websiteId,
          startAt: startAt.getTime(),
          endAt: win.endExclusive.getTime(),
          unit: opts.granularity,
          timezone: opts.timeZone,
        }),
        UMAMI_TIMEOUT_MS,
      ),
      headline,
    ]);
    if (raw.sessions.length === 0 && visitors > 0) return undefined;

    const keyLength = opts.granularity === "day" ? 10 : 7;
    const totals = new Map<string, number>();
    for (const point of raw.sessions) {
      const key = String(point.x).slice(0, keyLength);
      totals.set(key, (totals.get(key) ?? 0) + (Number(point.y) || 0));
    }
    return windowSeriesPoints(totals, win, opts.granularity, opts.timeZone);
  } catch {
    return undefined;
  }
}

/**
 * Unique visitors, or paid orders per visitor. Umami is checked first
 * (`getConnectionStatus`) so a credentials problem reads as "unavailable"
 * rather than a silent zero, then every call races a ~4s timeout.
 *
 * "All time" starts at the business's creation date.
 *
 * Visitors also carries a per-bucket series when `q.series` is set (and on the
 * previous window when `opts.previousSeries` is). It is best effort: if the
 * series can't be fetched the headline still returns, without `series`.
 * Conversion rate has no series.
 */
export async function trafficStat(
  q: StatQuery,
  widget: TrafficWidget,
  previous: MetricWindow | null,
  opts: { previousSeries?: boolean } = {},
): Promise<{ current: StatPart; previous: StatPart | null }> {
  const { db, ctx, win } = q;
  const websiteId = ctx.umamiWebsiteId;
  if (!websiteId) {
    throw new TrafficUnavailableError(
      unavailableCardData(
        "feature-off",
        "Analytics isn't set up for this store",
      ),
    );
  }

  try {
    const status = await withTimeout(getConnectionStatus(), UMAMI_TIMEOUT_MS);
    if (status !== "ok") {
      throw new TrafficUnavailableError(
        unavailableCardData(
          "umami-unavailable",
          status === "auth_failed"
            ? "Analytics can't connect right now"
            : "Analytics is temporarily unavailable",
        ),
      );
    }

    const measure = async (
      w: MetricWindow,
      withSeries: boolean,
    ): Promise<StatPart> => {
      const startAt = w.start ?? ctx.createdAt;
      const visitorsPromise = withTimeout(
        uniqueVisitors(websiteId, startAt, w.endExclusive),
        UMAMI_TIMEOUT_MS,
      );
      if (widget === "visitors") {
        if (!withSeries) {
          return { value: await visitorsPromise, detail: [] };
        }
        const [value, series] = await Promise.all([
          visitorsPromise,
          visitorSeries(websiteId, w, startAt, visitorsPromise, {
            granularity: q.granularity,
            timeZone: ctx.timeZone,
          }),
        ]);
        return series ? { value, detail: [], series } : { value, detail: [] };
      }
      const [visitors, paidOrders] = await Promise.all([
        visitorsPromise,
        db.order.count({ where: financeOrderScope(ctx.businessId, w) }),
      ]);
      return {
        value: visitors > 0 ? (paidOrders / visitors) * 100 : null,
        detail: [
          `${paidOrders} paid ${paidOrders === 1 ? "order" : "orders"} / ${visitors.toLocaleString("en-US")} ${visitors === 1 ? "visitor" : "visitors"}`,
        ],
      };
    };

    const [current, prior] = await Promise.all([
      measure(win, q.series),
      previous
        ? measure(previous, opts.previousSeries ?? false)
        : Promise.resolve(null),
    ]);
    return { current, previous: prior };
  } catch (err) {
    if (err instanceof TrafficUnavailableError) throw err;
    // Timeout or an unexpected throw: report it as unavailable (index.ts
    // sends non-Traffic errors to Sentry, so rethrow others untouched).
    if (err instanceof Error && err.message === "Umami timed out") {
      throw new TrafficUnavailableError(
        unavailableCardData(
          "umami-unavailable",
          "Analytics is temporarily unavailable",
        ),
      );
    }
    throw err;
  }
}
