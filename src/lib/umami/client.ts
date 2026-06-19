/**
 * Server-only Umami API client.
 *
 * Authenticates once with the platform service account and caches the bearer
 * token for ~6 hours. All requests are scoped by `websiteId`; the caller
 * (analytics tRPC router) is responsible for deriving websiteId from the
 * authenticated businessId — never from client input.
 *
 * On network/parse failures the exported functions return safe empty defaults
 * and tag the exception in Sentry rather than throwing, mirroring the
 * partial-data pattern in `business.getPaymentsOverview`.
 */

import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A metric value that may come as a plain number OR as `{ value, prev }`. */
type MetricValue = number | { value: number; prev: number };

function extractValue(v: MetricValue | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return v.value;
}

export type UmamiStats = {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
};

export type UmamiActive = {
  visitors: number;
};

export type UmamiPageviewPoint = {
  x: string; // date label
  y: number; // count
};

export type UmamiPageviewSeries = {
  pageviews: UmamiPageviewPoint[];
  sessions: UmamiPageviewPoint[];
};

export type UmamiMetricRow = {
  x: string; // label (url / referrer)
  y: number; // count
};

export type UmamiEventSeriesPoint = {
  x: string;
  y: number;
};

// ─── Token cache (module-level singleton) ─────────────────────────────────────

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Resolve the service-account password from env.
 *
 * Prefers the base64-encoded form (`UMAMI_API_PASSWORD_B64`) so the secret can
 * survive hosting platforms that mangle special characters — Coolify strips
 * quotes, and dotenv-expand interprets a literal `$` as a variable reference.
 * Base64 contains no such characters. Falls back to the plain value.
 */
function resolvePassword(): string {
  if (env.UMAMI_API_PASSWORD_B64) {
    return Buffer.from(env.UMAMI_API_PASSWORD_B64, "base64").toString("utf8");
  }
  if (env.UMAMI_API_PASSWORD) {
    return env.UMAMI_API_PASSWORD;
  }
  throw new Error(
    "Umami API password is not configured (set UMAMI_API_PASSWORD or UMAMI_API_PASSWORD_B64)",
  );
}

async function fetchToken(): Promise<string> {
  const res = await fetch(`${env.UMAMI_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: env.UMAMI_API_USERNAME,
      password: resolvePassword(),
    }),
    // Do not cache auth requests
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Umami auth failed: ${res.status} ${await res.text().catch(() => "")}`,
    );
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new Error("Umami auth response missing token");
  }

  return data.token;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const token = await fetchToken();
  cachedToken = token;
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  return token;
}

function invalidateToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function umamiFetch(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<unknown> {
  const token = await getToken();

  const url = new URL(`${env.UMAMI_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) {
      url.searchParams.set(k, String(v));
    }
  }

  const doFetch = async (t: string): Promise<Response> =>
    fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

  let res = await doFetch(token);

  // Retry once after re-authenticating on 401
  if (res.status === 401) {
    invalidateToken();
    const freshToken = await getToken();
    res = await doFetch(freshToken);
  }

  if (!res.ok) {
    throw new Error(
      `Umami API error ${res.status} for ${path}: ${await res.text().catch(() => "")}`,
    );
  }

  return res.json();
}

// ─── Exported typed wrappers ──────────────────────────────────────────────────

type BaseParams = {
  websiteId: string;
  startAt: number;
  endAt: number;
};

/**
 * GET /api/websites/:id/stats
 * Returns aggregate stats for the date range.
 */
export async function getStats(params: BaseParams): Promise<UmamiStats> {
  const empty: UmamiStats = {
    pageviews: 0,
    visitors: 0,
    visits: 0,
    bounces: 0,
    totaltime: 0,
  };

  try {
    const raw = (await umamiFetch(`/api/websites/${params.websiteId}/stats`, {
      startAt: params.startAt,
      endAt: params.endAt,
    })) as Record<string, MetricValue>;

    return {
      pageviews: extractValue(raw.pageviews),
      visitors: extractValue(raw.visitors),
      visits: extractValue(raw.visits),
      bounces: extractValue(raw.bounces),
      totaltime: extractValue(raw.totaltime),
    };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "umami", endpoint: "stats" },
    });
    return empty;
  }
}

/**
 * GET /api/websites/:id/active
 * Returns current active visitor count.
 */
export async function getActive(
  params: Pick<BaseParams, "websiteId">,
): Promise<UmamiActive> {
  try {
    const raw = (await umamiFetch(
      `/api/websites/${params.websiteId}/active`,
    )) as { visitors?: number } | number;

    // Umami returns either `{ visitors: N }` or just a number depending on version
    const visitors = typeof raw === "number" ? raw : (raw?.visitors ?? 0);

    return { visitors };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "umami", endpoint: "active" },
    });
    return { visitors: 0 };
  }
}

/**
 * GET /api/websites/:id/pageviews
 * Returns daily pageviews and sessions for charting.
 */
export async function getPageviewsSeries(
  params: BaseParams & { unit?: string; timezone?: string },
): Promise<UmamiPageviewSeries> {
  const empty: UmamiPageviewSeries = { pageviews: [], sessions: [] };

  try {
    const raw = (await umamiFetch(
      `/api/websites/${params.websiteId}/pageviews`,
      {
        startAt: params.startAt,
        endAt: params.endAt,
        unit: params.unit ?? "day",
        timezone: params.timezone ?? "UTC",
      },
    )) as { pageviews?: UmamiPageviewPoint[]; sessions?: UmamiPageviewPoint[] };

    return {
      pageviews: raw.pageviews ?? [],
      sessions: raw.sessions ?? [],
    };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "umami", endpoint: "pageviews" },
    });
    return empty;
  }
}

/**
 * GET /api/websites/:id/metrics
 * Returns top-N metrics rows for a given type (url, referrer, etc.).
 */
export async function getMetrics(
  params: BaseParams & { type: string; limit?: number },
): Promise<UmamiMetricRow[]> {
  try {
    const raw = (await umamiFetch(`/api/websites/${params.websiteId}/metrics`, {
      startAt: params.startAt,
      endAt: params.endAt,
      type: params.type,
      limit: params.limit ?? 10,
    })) as UmamiMetricRow[];

    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "umami", endpoint: "metrics", type: params.type },
    });
    return [];
  }
}

/**
 * GET /api/websites/:id/events/series
 * Returns custom event series for charting (Phase 2/3).
 */
export async function getEventsSeries(
  params: BaseParams & { unit?: string; timezone?: string },
): Promise<UmamiEventSeriesPoint[]> {
  try {
    const raw = (await umamiFetch(
      `/api/websites/${params.websiteId}/events/series`,
      {
        startAt: params.startAt,
        endAt: params.endAt,
        unit: params.unit ?? "day",
        timezone: params.timezone ?? "UTC",
      },
    )) as UmamiEventSeriesPoint[];

    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "umami", endpoint: "events/series" },
    });
    return [];
  }
}
