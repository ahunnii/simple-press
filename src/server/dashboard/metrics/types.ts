import type { z } from "zod";

import type {
  cardDataInputSchema,
  SeriesPoint,
} from "~/lib/dashboard/card-data";
import type { DashboardRangeGranularity } from "~/lib/dashboard/ranges";
import type { TxClient } from "~/server/db";

/** What `dashboard.cardData` accepts (range may be omitted). */
export type CardDataRequest = z.infer<typeof cardDataInputSchema>;

export type DashboardMetricsContext = {
  businessId: string;
  /** `Business.timeZone` (validated again before it reaches SQL). */
  timeZone: string;
  now: Date;
  /** Business creation time: the start of "All time" for Umami. */
  createdAt: Date;
  /** Set only when `umamiEnabled` and a website id exist. */
  umamiWebsiteId: string | null;
  isEnabled: (key: string) => boolean;
};

/**
 * One half-open window `[start, endExclusive)` on instants, plus the matching
 * whole-calendar-day bounds for date-only columns. A resolved range and its
 * `previous` window are both assignable to this.
 */
export type MetricWindow = {
  /** null = no lower bound (All time). */
  start: Date | null;
  endExclusive: Date;
  startYmd: string | null;
  endYmdExclusive: string;
};

/** What a family computes for one window. */
export type StatPart = {
  /** null = can't be computed (average over zero orders). */
  value: number | null;
  detail: string[];
  note?: string;
  series?: SeriesPoint[];
};

export type StatQuery = {
  db: TxClient;
  ctx: DashboardMetricsContext;
  win: MetricWindow;
  /** Build `series` (current window only). */
  series: boolean;
  granularity: DashboardRangeGranularity;
};
