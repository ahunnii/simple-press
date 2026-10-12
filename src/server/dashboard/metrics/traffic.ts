import type { MetricWindow, StatPart, StatQuery } from "./types";
import type { CardData } from "~/lib/dashboard/card-data";
import { unavailableCardData } from "~/lib/dashboard/card-data";
import { financeOrderScope } from "~/lib/finance/order-scope";
import { getConnectionStatus, getStats } from "~/lib/umami/client";

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
 * Unique visitors, or paid orders per visitor. Umami is checked first
 * (`getConnectionStatus`) so a credentials problem reads as "unavailable"
 * rather than a silent zero, then every call races a ~4s timeout.
 *
 * "All time" starts at the business's creation date.
 */
export async function trafficStat(
  q: StatQuery,
  widget: TrafficWidget,
  previous: MetricWindow | null,
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

    const measure = async (w: MetricWindow): Promise<StatPart> => {
      const startAt = w.start ?? ctx.createdAt;
      const visitorsPromise = withTimeout(
        uniqueVisitors(websiteId, startAt, w.endExclusive),
        UMAMI_TIMEOUT_MS,
      );
      if (widget === "visitors") {
        return { value: await visitorsPromise, detail: [] };
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
      measure(win),
      previous ? measure(previous) : Promise.resolve(null),
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
